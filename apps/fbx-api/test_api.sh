#!/usr/bin/env bash
# fbx-api 엔드투엔드 점검 — 로컬 dev 또는 배포본에 대고 돌린다. 끝에 통과/실패 수를 찍는다.
#
#   로컬:  npx wrangler dev --local --port 8787 --var WORKER_TOKEN:wtok --var ADMIN_TOKEN:atok \
#              --var INVITE_CODES:plota2026 --var ASSETS_BASE:http://assets.test
#          (다른 창에서) BASE=http://127.0.0.1:8787 bash apps/fbx-api/test_api.sh
#   배포본: BASE=https://fbx-api.plota.ai INVITE=<초대코드> WTOK=<워커토큰> ATOK=<운영자토큰> \
#              ASSETS=https://assets.plota.ai bash apps/fbx-api/test_api.sh
#
# 주의: 작업 행을 실제로 만들고 숨김·requeue 까지 한다. 배포본에 돌리면 뒤에 운영자 삭제로 치운다.
#   curl -X POST "$BASE/admin/jobs/<id>" -H "Authorization: Bearer $ATOK" -d '{"delete":true}'
set -u
B="${BASE:-http://127.0.0.1:8787}"
INVITE="${INVITE:-plota2026}"
WTOK="${WTOK:-wtok}"
ATOK="${ATOK:-atok}"
ASSETS="${ASSETS:-http://assets.test}"
P="$(mktemp -d)"
export P
trap 'rm -rf "$P"' EXIT
python3 -c "
import zlib,struct
def chunk(t,d):
    c=t+d
    return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\xff\x00\x00'))+chunk(b'IEND',b'')
import sys,os,time
p=os.environ['P']
# 같은 이미지는 중복 제거에 걸리므로 실행마다 다른 바이트를 끝에 붙인다
open(p+'/kid.png','wb').write(png+chunk(b'teXt',b'run\x00'+str(time.time()).encode()))
open(p+'/Salute.fbx','wb').write(b'Kaydara FBX Binary  \x00'+b'clip'*64)
open(p+'/fail.png','wb').write(png+chunk(b'teXt',b'fail\x00'+str(time.time()).encode()))
"
pass=0; fail=0
ck() { if [ "$2" = "$3" ]; then echo "PASS $1"; pass=$((pass+1)); else echo "FAIL $1  기대=$2 실제=$3"; fail=$((fail+1)); fi; }
code() { curl -s -o "$P/body" -w "%{http_code}" "$@"; }

ck "초대코드 없으면 403" 403 "$(code -X POST $B/jobs -F invite=nope -F consent=1 -F image=@$P/kid.png)"
ck "동의 없으면 400" 400 "$(code -X POST $B/jobs -F invite=$INVITE -F image=@$P/kid.png)"
ck "이미지 아니면 415" 415 "$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/Salute.fbx)"
ck "FBX 아닌 클립은 415" 415 "$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/kid.png -F clip_Bad=@$P/kid.png)"

c=$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/kid.png \
      -F 'anims={"anims":["Walking","Salute"],"default":"Walking"}' -F clip_Salute=@$P/Salute.fbx)
ck "접수 201" 201 "$c"
ID=$(python3 -I -c "import json;print(json.load(open('$P/body'))['id'])")
TOK=$(python3 -I -c "import json;print(json.load(open('$P/body'))['owner_token'])")
echo "  job id=$ID"

code -s $B/jobs/$ID >/dev/null
ck "접수 직후 queued" queued "$(python3 -I -c "import json;print(json.load(open('$P/body'))['status'])")"
ck "대기 순서 1" 1 "$(python3 -I -c "import json;print(json.load(open('$P/body'))['queue_position'])")"

ck "워커 토큰 없으면 401" 401 "$(code -X POST $B/worker/claim -H 'Authorization: Bearer wrong')"
ck "claim 200" 200 "$(code -X POST $B/worker/claim -H "Authorization: Bearer $WTOK")"
ck "claim 한 작업 id 일치" "$ID" "$(python3 -I -c "import json;print(json.load(open('$P/body'))['job']['id'])")"
ck "요청서 그대로 전달" '{"anims": ["Walking", "Salute"], "default": "Walking"}' "$(python3 -I -c "import json;print(json.dumps(json.load(open('$P/body'))['job']['anim_spec'],ensure_ascii=False))")"
ck "업로드 클립 목록 전달" 'Salute' "$(python3 -I -c "import json;print(json.load(open('$P/body'))['job']['upload_clips'][0]['name'])")"
ck "빈 큐에서 두 번째 claim 은 null" null "$(code -X POST $B/worker/claim -H "Authorization: Bearer $WTOK" >/dev/null; python3 -I -c "import json;print(json.dumps(json.load(open('$P/body'))['job']))")"

curl -s $B/worker/jobs/$ID/input -H "Authorization: Bearer $WTOK" -o $P/got.png
ck "입력 이미지 원본과 동일" "$(md5sum < $P/kid.png | cut -d' ' -f1)" "$(md5sum < $P/got.png | cut -d' ' -f1)"
curl -s $B/worker/jobs/$ID/clips/Salute -H "Authorization: Bearer $WTOK" -o $P/got.fbx
ck "첨부 클립 원본과 동일" "$(md5sum < $P/Salute.fbx | cut -d' ' -f1)" "$(md5sum < $P/got.fbx | cut -d' ' -f1)"

ck "진행 보고 200" 200 "$(code -X POST $B/worker/jobs/$ID/progress -H "Authorization: Bearer $WTOK" -H 'Content-Type: application/json' -d '{"step":"rig","progress":50,"log_tail":"seed 123"}')"
code -s $B/jobs/$ID >/dev/null
ck "진행률 반영" 50 "$(python3 -I -c "import json;print(json.load(open('$P/body'))['progress'])")"
ck "워커 온라인 표시" True "$(python3 -I -c "import json;print(json.load(open('$P/body'))['worker_online'])")"

ck "산출물 업로드 200" 200 "$(code -X PUT $B/worker/jobs/$ID/files/final.fbx -H "Authorization: Bearer $WTOK" --data-binary @$P/Salute.fbx)"
ck "anims 업로드 200" 200 "$(code -X PUT $B/worker/jobs/$ID/files/anims/Walking_ovdr.fbx -H "Authorization: Bearer $WTOK" --data-binary @$P/Salute.fbx)"
ck "허용 목록 밖 이름은 400" 400 "$(code -X PUT $B/worker/jobs/$ID/files/evil.exe -H "Authorization: Bearer $WTOK" --data-binary @$P/Salute.fbx)"
# 경로 탈출: ../ 와 %2e%2e 는 모두 라우팅 전 URL 정규화에서 접히므로 다른 경로가 되어 404 (R2 키로는 못 나간다)
ck "경로 탈출(../)은 라우팅 전 정규화로 404" 404 "$(code --path-as-is -X PUT $B/worker/jobs/$ID/files/anims/../../x.fbx -H "Authorization: Bearer $WTOK" --data-binary @$P/Salute.fbx)"
ck "경로 탈출(%2e%2e)도 404" 404 "$(code --path-as-is -X PUT $B/worker/jobs/$ID/files/anims/%2e%2e/%2e%2e/x.fbx -H "Authorization: Bearer $WTOK" --data-binary @$P/Salute.fbx)"

ck "finish 200" 200 "$(code -X POST $B/worker/jobs/$ID/finish -H "Authorization: Bearer $WTOK" -H 'Content-Type: application/json' -d '{"ok":true,"seed_used":123,"skeleton_src":"unirig","body_type":"bighead","anim_default":"Walking","worker_job_id":"20261011-000000-abcdef","files":["final.fbx","anims/Walking_ovdr.fbx"]}')"
code -s $B/jobs/$ID >/dev/null
ck "done 상태" done "$(python3 -I -c "import json;print(json.load(open('$P/body'))['status'])")"
ck "공개 URL 생성" "$ASSETS/p/$ID/final.fbx" "$(python3 -I -c "import json;print(json.load(open('$P/body'))['files']['final.fbx'])")"
ck "anims URL 생성" "$ASSETS/p/$ID/anims/Walking_ovdr.fbx" "$(python3 -I -c "import json;print(json.load(open('$P/body'))['files']['anims/Walking_ovdr.fbx'])")"

ck "같은 이미지 재접수 200" 200 "$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/kid.png)"
ck "중복이면 기존 id 즉시 반환" "$ID true done" "$(python3 -I -c "import json;d=json.load(open('$P/body'));print(d['id'],str(d['duplicate']).lower(),d['status'])")"

ck "owner 아닌 토큰 수정 403" 403 "$(code -X PATCH $B/jobs/$ID -H 'Authorization: Bearer nope' -H 'Content-Type: application/json' -d '{"title":"x"}')"
ck "owner 제목 수정 200" 200 "$(code -X PATCH $B/jobs/$ID -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"title":"우리 아이 캐릭터"}')"
ck "제목 반영" "우리 아이 캐릭터" "$(python3 -I -c "import json;print(json.load(open('$P/body'))['title'])")"

code -s "$B/jobs?public=1&limit=5" >/dev/null
ck "갤러리에 노출" 1 "$(python3 -I -c "import json;print(len(json.load(open('$P/body'))['items']))")"

ck "운영자 토큰 없으면 401" 401 "$(code -X POST $B/admin/jobs/$ID -H 'Authorization: Bearer nope' -d '{}')"
ck "숨기기 200" 200 "$(code -X POST $B/admin/jobs/$ID -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{"hidden":true}')"
ck "숨긴 작업은 404" 404 "$(code -s $B/jobs/$ID)"
code -s "$B/jobs?public=1&limit=5" >/dev/null
ck "숨긴 작업은 갤러리에서도 빠짐" 0 "$(python3 -I -c "import json;print(len(json.load(open('$P/body'))['items']))")"
ck "숨긴 뒤에는 중복 반환 안 함(새 접수)" 201 "$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/kid.png)"

# 실패한 작업은 중복 제거에서 빼야 같은 그림으로 재시도할 수 있다 (API 모드는 크래시 재시도를 안 한다)
F=$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/fail.png | tail -c 0; python3 -I -c "import json;print(json.load(open('$P/body'))['id'])")
code -X POST $B/worker/claim -H "Authorization: Bearer $WTOK" >/dev/null
ck "실패 보고 200" 200 "$(code -X POST $B/worker/jobs/$F/finish -H "Authorization: Bearer $WTOK" -H 'Content-Type: application/json' -d '{"ok":false,"comfy_crash":true}')"
code -s $B/jobs/$F >/dev/null
ck "크래시 실패 안내문" "처리 중 생성 서버가 재시작되었습니다. 같은 이미지로 다시 접수해 주세요." "$(python3 -I -c "import json;print(json.load(open('$P/body'))['error_public'])")"
ck "실패한 그림은 다시 접수된다(201)" 201 "$(code -X POST $B/jobs -F invite=$INVITE -F consent=1 -F image=@$P/fail.png)"
ck "새 작업 id 로 들어감" "" "$(python3 -I -c "import json;d=json.load(open('$P/body'));print('' if d['id']!='$F' else '같은 id')")"

ck "requeue 200" 200 "$(code -X POST $B/admin/jobs/$ID -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{"hidden":false,"requeue":true}')"
code -s $B/jobs/$ID >/dev/null
ck "requeue 후 queued" queued "$(python3 -I -c "import json;print(json.load(open('$P/body'))['status'])")"

ck "CORS 프리플라이트 204" 204 "$(code -X OPTIONS $B/jobs -H 'Origin: https://plota.ai')"
ck "없는 경로 404" 404 "$(code -s $B/nope)"

echo; echo "통과 $pass / 실패 $fail"
