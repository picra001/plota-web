import type { ReactNode } from "react";
import Link from "./localized-link";
import type { UiLang } from "@/lib/i18n";

// FBX Studio 사용 설명서. 화면 문구(<Ui>)는 각 언어의 사이트 화면에 보이는 그대로 적는다 — 화면 문구를 바꾸면 여기도 맞출 것.

const Ui = ({ children }: { children: ReactNode }) => <span className="fg-ui">{children}</span>;

function Steps({ items }: { items: ReactNode[] }) {
  return <ol className="fg-steps">{items.map((item, i) => <li key={i}><div>{item}</div></li>)}</ol>;
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return <div className="fg-table"><table><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>;
}

function Callout({ tone = "tip", title, children }: { tone?: "tip" | "warn"; title: string; children: ReactNode }) {
  return <div className={`fg-callout ${tone}`}><strong>{title}</strong>{children}</div>;
}

function GoodFigure({ label }: { label: string }) {
  return <svg viewBox="0 0 220 200" role="img" aria-label={label}>
    <line className="fg-ground" x1="20" y1="188" x2="200" y2="188" />
    <circle className="fg-head" cx="110" cy="36" r="20" />
    <path className="fg-line" d="M110 56 V122 M110 70 L64 112 M110 70 L156 112 M110 122 L88 186 M110 122 L132 186" />
    <path className="fg-line fg-ok" d="M64 112 l-6 16 M64 112 l-2 17 M64 112 l2 17 M64 112 l6 15 M64 112 l-9 8" />
    <path className="fg-line fg-ok" d="M156 112 l6 16 M156 112 l2 17 M156 112 l-2 17 M156 112 l-6 15 M156 112 l9 8" />
  </svg>;
}

function BadFigure({ label }: { label: string }) {
  return <svg viewBox="0 0 220 200" role="img" aria-label={label}>
    <line className="fg-ground" x1="20" y1="188" x2="200" y2="188" />
    <circle className="fg-head" cx="110" cy="36" r="20" />
    <path className="fg-line" d="M110 56 V122 M110 70 L96 122 M110 70 L124 122 M110 122 L104 186 M110 122 L116 186" />
    <path className="fg-line fg-bad" d="M96 122 l-18 6 M96 122 l-14 14 M96 122 l-4 18 M96 122 l6 17 M96 122 l-16 -6" />
    <path className="fg-line fg-bad" d="M124 122 l18 6 M124 122 l14 14 M124 122 l4 18 M124 122 l-6 17 M124 122 l16 -6" />
  </svg>;
}

type Section = { id: string; title: string; body: ReactNode };
type Guide = { toc: string; kicker: string; title: string; lede: string; facts: [string, string][]; sections: Section[]; footer: string };

const KO: Guide = {
  toc: "목차",
  kicker: "FBX Studio · 사용 설명서",
  title: "그림 한 장으로 OVERDARE용 FBX 만들기",
  lede: "그림을 올리면 3D 모델로 만들어 OVERDARE 스튜디오에 바로 가져올 수 있는 FBX로 돌려드립니다. 캐릭터는 뼈대와 애니메이션까지, 정적 물체·움직이는 장치·바닥은 뼈대 없는 FBX로 만듭니다.",
  facts: [["필요한 것", "초대 코드 + 그림 1장"], ["걸리는 시간 (시작 후)", "바닥 1분 · 캐릭터·물체 4~10분 · 장치 10~15분"], ["받는 파일", "FBX · GLB (캐릭터는 클립 FBX도)"]],
  sections: [
    { id: "what", title: "무엇을 만들어 주나", body: <>
      <p>보낸 그림은 작업실 PC 한 대(GPU 1개)에서 아래 순서로 처리됩니다. 한 번에 한 그림씩 처리하므로, 앞에 다른 그림이 있으면 차례를 기다립니다.</p>
      <ol className="fg-pipe" aria-label="처리 순서">{["그림 준비", "3D 모양 만들기", "메시 점검", "뼈대 맞추기", "엔진용 정리", "애니메이션 붙이기", "파일 업로드"].map((s, i) => <li key={s}><b>{i + 1}</b>{s}</li>)}</ol>
      <p>결과 FBX에는 <b>메시 1개, 뼈대, 애니메이션 1개</b>가 함께 들어 있습니다. 뼈대는 OVERDARE 기본 캐릭터(ODA)와 같은 본 이름·구조를 따르고, 그림에서 손가락이 또렷하게 갈라져 있으면 손가락 본도 들어갑니다(<a href="#fingers">손가락과 손</a>).</p>
    </> },
    { id: "kinds", title: "만들 수 있는 4가지", body: <>
      <p>만들기 화면 맨 위 <Ui>만들 것</Ui>에서 고릅니다. 캐릭터만 뼈대와 애니메이션이 들어가고, 나머지 셋은 모양만 있는 FBX입니다.</p>
      <Table head={["종류", "이런 것", "그림 고르기", "받는 파일", "스튜디오에서"]} rows={[
        [<b key="c">캐릭터</b>, "사람, 동물, 마스코트", "한 명, 정면, 팔을 몸에서 뗀 A자 자세 (아래 '좋은 그림 고르기')", "FBX(메시+뼈대+동작) · 동작별 FBX · GLB", "그대로 가져와 재생·편집"],
        [<b key="s">정적 물체</b>, "나무, 테이블, 상자, 바리케이드", "물체 하나, 형태가 잘 보이는 각도, 단색 배경", "FBX 1개 (뼈대 없음, 원점 = 바닥 가운데)", "가져와서 Anchored 로 고정"],
        [<b key="m">움직이는 장치</b>, "포탑, 회전하는 받침, 크레인", "받침과 윗부분의 경계가 수평으로 보이는 측면·정면 그림", "받침 FBX + 윗부분 FBX (윗부분 원점 = 회전축)", "두 파트를 한 모델로 묶고 스크립트로 윗부분을 돌림"],
        [<b key="g">바닥</b>, "타일, 흙, 돌바닥 무늬", "위에서 내려다본 무늬. 가운데 정사각형을 씀", "평평한 바닥 FBX 1개 (한 변 최대 2040cm)", "여러 장을 이어 붙여 넓은 바닥"],
      ]} />
      <h3>캐릭터 외 종류의 설정</h3>
      <ul>
        <li><b>정적 물체</b>: <Ui>높이 (cm)</Ui>. 스튜디오에 들어갔을 때의 전체 높이입니다. 기본 120cm.</li>
        <li><b>움직이는 장치</b>: <Ui>전체 높이 (cm)</Ui>(기본 200cm), <Ui>자르는 높이</Ui>, <Ui>그림 속 장치가 바라보는 쪽</Ui>. 자르는 높이는 오른쪽 그림 위의 점선을 끌어 받침과 윗부분의 경계에 맞춥니다. 윗부분은 이 높이를 회전축으로 돕니다.</li>
        <li><b>바닥</b>: <Ui>바닥 한 변 (cm)</Ui>(기본 2000cm), <Ui>무늬 반복 횟수</Ui>. 작은 타일 무늬면 4~8로 올리면 무늬가 촘촘하게 반복됩니다.</li>
      </ul>
      <Callout tone="warn" title="새로 연 종류입니다"><p>정적 물체·움직이는 장치·바닥은 새로 열었습니다. 뼈대 없는 FBX를 스튜디오에 가져오는 절차와 결과는 확인하는 중이라, 이 설명서의 해당 부분이 바뀔 수 있습니다.</p></Callout>
    </> },
    { id: "why", title: "Mixamo 동작과 OVERDARE 편집이 함께 되는 이유", body: <>
      <p>AI로 만든 캐릭터 FBX는 보통 둘 중 하나에서 막힙니다. Mixamo 동작을 붙이면 스튜디오에서 손대기 어렵고, 스튜디오용으로 만들면 Mixamo의 많은 동작을 쓸 수 없습니다. 이 서비스는 마지막 변환 단계에서 이 둘을 한 파일 안에서 맞춥니다.</p>
      <Table head={["할 수 있는 것", "어떻게 가능한가"]} rows={[
        [<b key="a">Mixamo 동작을 그대로 붙이기</b>, "Mixamo 클립을 받는 순간, 동작을 OVERDARE 뼈대에 맞춰 다시 계산해 구워 넣습니다. 몸의 각 마디가 Mixamo에서 향하던 방향을 그대로 따라가도록 옮기고, 키 차이로 발이 뜨거나 땅에 박히지 않게 발 높이를 보정합니다."],
        [<b key="b">스튜디오 애니메이션 에디터에서 편집</b>, "뼈대의 본 이름·계층·각 본의 축 방향을 OVERDARE 공식 레퍼런스 캐릭터와 똑같이 만듭니다. 위치만 이 캐릭터에 맞추고 축은 그대로 두기 때문에, 에디터에서 회전값을 바꾸면 기본 캐릭터와 같은 방향으로 움직입니다."],
        [<b key="c">다른 OVERDARE 동작 복사해 넣기</b>, "기본 자세(팔을 내린 A자 자세)를 레퍼런스와 같은 각도로 다시 잡아 메시에 굽습니다. 출발 자세가 같아서, 다른 캐릭터의 동작을 복사해도 팔과 다리가 엇나가지 않습니다."],
        [<b key="d">손가락 동작</b>, "OVERDARE 기본 뼈대에는 손가락 본이 없어, 손가락은 손 본 아래에 Mixamo와 같은 이름으로 추가합니다. Mixamo 동작의 주먹, 경례 손날 같은 손가락 움직임이 따라오고, 손바닥이 향하는 방향도 기본 자세에서 미리 맞춰 둡니다."],
        [<b key="e">스튜디오에 바로 들어가는 형식</b>, "메시 1개, 정점당 본 4개 이하, 본 이름 영문, Z-up, cm 단위, 텍스처 포함, 동작은 제자리, 정지 구간 제거. OVERDARE가 막거나 경고하는 조건을 미리 다 맞춰서 내보냅니다."],
      ]} />
      <Callout tone="warn" title="아직 안 되는 것"><p>본 구조는 OVERDARE 기본 캐릭터와 같지만, 스튜디오는 이 캐릭터를 공식 ODA Rig가 아니라 <b>Custom Skeleton</b>으로 인식합니다. 다른 OVERDARE 동작을 복사하면 손가락은 움직이지 않습니다(그 동작에 손가락 키가 없음).</p></Callout>
    </> },
    { id: "drawing", title: "좋은 그림 고르기", body: <>
      <p>결과의 품질은 대부분 그림에서 정해집니다. 아래 조건에 가까울수록 실패가 줄고 움직임이 자연스럽습니다.</p>
      <div className="fg-pair">
        <div className="fg-card good"><h4><span className="fg-badge">GOOD</span> 이렇게 그려 주세요</h4><GoodFigure label="정면을 보고 팔을 몸에서 떼고 선 캐릭터" /><ul>
          <li>캐릭터 <b>한 명</b>, <b>정면</b>을 보고 섬</li><li>팔을 몸에서 비스듬히 떼기 (A자 자세)</li><li>다리도 조금 벌려 서로 붙지 않게</li><li><b>단색 배경</b></li><li>손가락 다섯 개를 <b>곧게 펴서 가는 틈만 두고</b> 나란히</li>
        </ul></div>
        <div className="fg-card bad"><h4><span className="fg-badge">AVOID</span> 이런 그림은 실패하기 쉬워요</h4><BadFigure label="팔을 몸에 붙이고 손가락을 쫙 벌린 캐릭터" /><ul>
          <li>여러 캐릭터가 한 그림에</li><li>복잡한 배경, 글자나 무늬</li><li>팔이 몸통에 붙거나 몸 뒤로 숨음</li><li>옆모습이나 비스듬한 각도</li><li>손가락을 <b>부채처럼 쫙 벌림</b>, 주먹, 갈고리처럼 굽힘</li>
        </ul></div>
      </div>
      <Callout title="머리가 큰 캐릭터도 됩니다"><p>머리가 키의 3분의 1이 넘는 귀여운 캐릭터도 지원합니다. 다만 손이 뭉툭한 경우가 많아 손가락 본은 대개 들어가지 않습니다.</p></Callout>
      <p>파일은 <Ui>PNG</Ui> <Ui>JPG</Ui> <Ui>WEBP</Ui>, <b>10MB 이하</b>만 받습니다.</p>
    </> },
    { id: "send", title: "그림 보내기", body: <>
      <p>상단 메뉴의 <Link href="/ko/fbx/create">만들기</Link> 화면에서 보냅니다.</p>
      <Steps items={[
        <p key="0"><Ui>만들 것</Ui>에서 종류를 고릅니다(<a href="#kinds">만들 수 있는 4가지</a>).</p>,
        <><p><Ui>초대 코드</Ui>에 받은 초대 코드를 넣습니다.</p><p>한 번 넣으면 이 브라우저가 기억합니다. 초대 링크로 들어오면 자동으로 채워집니다.</p></>,
        <p key="2"><Ui>그림</Ui> 칸에 그림을 끌어다 놓거나 <Ui>파일 고르기</Ui>로 고릅니다.</p>,
        <><p><b>캐릭터</b>는 <Ui>넣을 동작</Ui>에서 붙일 애니메이션을 고릅니다. 기본으로 <b>Walking</b>과 <b>Salute</b>를 고를 수 있습니다. 다른 종류는 이 자리에 <Ui>크기와 설정</Ui>이 나옵니다.</p><ul>
          <li>직접 받은 Mixamo 동작을 쓰려면 <Ui>Mixamo FBX 클립 추가</Ui>. Mixamo에서 <b>FBX Binary · With Skin · 30 fps</b>로 받은 파일을 올립니다.</li>
          <li>클립은 그림 하나당 <b>최대 4개</b>, 파일당 <b>10MB 이하</b>입니다.</li>
          <li>클립을 두 개 이상 고르면 <Ui>메인 FBX에 넣을 동작</Ui>에서 메인 FBX에 넣을 동작을 정합니다. 나머지는 클립별 FBX로 따로 받습니다.</li>
        </ul></>,
        <p key="4">동의 체크박스를 읽고 체크합니다. 그림과 결과가 <b>링크를 아는 사람 누구나 볼 수 있는 페이지</b>에 올라간다는 내용입니다(<a href="#privacy">공개와 삭제</a>).</p>,
        <p key="5"><Ui>그림 보내기</Ui>를 누르면 결과 페이지로 넘어갑니다.</p>,
      ]} />
      <Callout title="같은 그림을 다시 보내면"><p>이미 만든 결과 페이지로 바로 연결됩니다. 새로 만들지 않으므로 기다릴 필요가 없습니다.</p></Callout>
    </> },
    { id: "wait", title: "진행 상황 보기", body: <>
      <p>결과 페이지는 스스로 새로고침됩니다. 창을 닫아도 처리는 계속되니, <Ui>링크 복사</Ui>로 주소를 복사해 두었다가 나중에 다시 열면 됩니다. 이 브라우저에서 보낸 그림은 <Link href="/ko/fbx/assets">에셋</Link>의 <b>내 작품</b>에도 모입니다.</p>
      <Table head={["화면 문구", "뜻"]} rows={[
        [<Ui key="a">차례를 기다리는 중</Ui>, "차례를 기다리는 중. 앞에 몇 개가 있는지 함께 표시됩니다."],
        [<Ui key="b">3D 모양 만드는 중</Ui>, "그림으로 3D 모양을 만드는 중. 가장 오래 걸리는 단계입니다."],
        [<Ui key="c">뼈대 맞추는 중</Ui>, "뼈대를 맞추는 중. 잘 안 맞으면 자동으로 다시 시도합니다."],
        [<Ui key="d">엔진용으로 정리 중</Ui>, "OVERDARE 규격(크기, 본 이름, 정점당 본 수)에 맞추는 중."],
        [<Ui key="e">애니메이션 붙이는 중</Ui>, "손가락을 확인하고 고른 동작을 붙이는 중."],
        [<Ui key="x">FBX로 정리하는 중</Ui>, "캐릭터 외 종류: 크기·원점을 맞춰 FBX로 내보내는 중."],
        [<Ui key="f">파일 올리는 중</Ui>, "결과 파일을 올리는 중. 곧 끝납니다."],
      ]} />
      <Callout tone="warn" title="“작업실 PC가 꺼져 있습니다”가 보이면"><p>작업실 PC가 잠시 꺼져 있다는 뜻입니다. 그림은 대기열에 남아 있고, PC가 돌아오면 순서대로 처리됩니다. 다시 보낼 필요는 없습니다.</p></Callout>
    </> },
    { id: "files", title: "결과 받기", body: <>
      <p>처리가 끝나면 결과 페이지에 3D 미리보기와 내려받기 버튼이 나타납니다.</p>
      <Table head={["버튼", "들어 있는 것", "언제 쓰나"]} rows={[
        [<Ui key="a">FBX 받기</Ui>, "메시 + 뼈대 + 메인 애니메이션 1개", "스튜디오에 가져올 기본 파일"],
        [<><Ui>Walking 클립 받기</Ui> 등</>, "같은 캐릭터 + 해당 동작 1개", "동작을 여러 개 쓰고 싶을 때. 메인과 같은 동작에는 “메인 FBX에도 들어 있음”이 붙습니다"],
        [<Ui key="c">GLB 미리보기 받기</Ui>, "텍스처를 입힌 3D 모델(뼈대 없음)", "모양만 확인하거나 다른 도구에서 볼 때"],
        [<Ui key="p">받침 FBX (고정 부품) 받기</Ui>, "움직이는 장치의 받침", "스튜디오에 가져와 바닥에 둠"],
        [<Ui key="q">윗부분 FBX (움직이는 부품) 받기</Ui>, "움직이는 장치의 윗부분. 원점이 회전축", "받침과 한 모델로 묶고 스크립트로 회전"],
      ]} />
      <p>정적 물체와 바닥은 <Ui>FBX 받기</Ui> 하나로 받습니다.</p>
      <p><Ui>제목</Ui>에 이름을 넣고 <Ui>제목 저장</Ui>으로 결과의 제목을 바꿀 수 있습니다. 계정이 없어서, 제목을 바꿀 권한은 <b>그림을 보낸 브라우저에만</b> 있습니다.</p>
    </> },
    { id: "import", title: "OVERDARE로 가져오기", body: <>
      <Steps items={[
        <p key="1">OVERDARE 스튜디오 <b>Home</b> 탭의 <Ui>Import</Ui> 버튼을 누릅니다. (Import3D나 BulkImport가 아니라 Import여야 텍스처가 자동으로 연결됩니다.)</p>,
        <p key="2">내려받은 FBX를 고릅니다.</p>,
        <p key="3">Import Settings에서 <b>Scale Unit</b>을 <Ui>Meter</Ui>로, <Ui>Import Only as Model</Ui>은 <b>끈 채로</b> 가져옵니다.</p>,
        <p key="4">가져온 뒤 캐릭터의 <code>RenderFidelity</code>를 <Ui>Precise</Ui>로 바꿉니다. Automatic이면 멀리서 볼 때 세부 모양이 뭉개져 움직임이 어색해 보일 수 있습니다.</p>,
      ]} />
      <Callout title="캐릭터 외 종류"><p>정적 물체·움직이는 장치·바닥 FBX는 뼈대와 애니메이션이 없습니다. 단위는 cm, 정적 물체·바닥의 원점은 바닥 가운데, 장치 윗부분의 원점은 회전축입니다. 가져오는 화면의 설정과 결과는 확인하는 중입니다.</p></Callout>
      <Callout title="알아두면 좋은 점"><p>캐릭터는 <b>Custom Skeleton</b>으로 인식됩니다. 본 이름과 구조는 OVERDARE 기본 캐릭터를 따르지만, 스튜디오가 공식 ODA Rig로 판정하지는 않습니다.</p><p>모든 동작은 <b>제자리</b>에서 움직이도록 만들어져 있습니다. 앞으로 걸어가는 이동은 스크립트로 캐릭터를 옮겨서 처리하세요.</p></Callout>
    </> },
    { id: "fingers", title: "손가락과 손", body: <>
      <p>손가락 본은 그림의 손을 보고 <b>자동으로</b> 넣을지 정합니다. 손가락 끝이 또렷하게 갈라진 손이면 손가락마다 3마디씩(한 손 15개) 들어가고, 고른 동작의 손가락 움직임(주먹, 경례 손날 등)이 그대로 따라옵니다.</p>
      <h3>손가락 본이 안 들어가는 경우</h3>
      <ul><li>손이 뭉툭하거나 손가락이 붙어 있는 그림 (머리 큰 캐릭터에서 흔함)</li><li>손가락이 갈고리처럼 굽어 있는 그림</li><li>손가락을 넣어 굽혀 봤을 때 손 모양이 찢어질 것 같으면, 망가진 손 대신 손가락 없는 손으로 내보냅니다</li></ul>
      <p>손가락 본이 없어도 캐릭터는 정상적으로 움직입니다. 손은 손목과 함께 한 덩어리로 움직입니다.</p>
      <Callout title="손가락을 살리려면"><p>손가락 다섯 개를 곧게 펴서 나란히 두되, 손가락 사이에 가는 틈이 보이게 그려 주세요. 손가락을 부채처럼 크게 벌리면 동작 중에 손가락이 오리발처럼 벌어져 보입니다.</p></Callout>
    </> },
    { id: "trouble", title: "문제가 생겼을 때", body: <>
      <h3>보내기 전에 뜨는 메시지</h3>
      <Table head={["메시지", "해결"]} rows={[
        ["초대코드가 올바르지 않습니다", "받은 코드를 앞뒤 공백 없이 다시 넣어 주세요."],
        ["이미지는 10MB 이하", "그림 크기를 줄이거나 JPG/WEBP로 저장해 다시 올려 주세요."],
        ["PNG·JPG·WEBP 만 받습니다", "다른 형식(HEIC, GIF 등)은 PNG로 바꿔 올려 주세요."],
        ["클립 FBX 는 10MB 이하 / FBX 파일이 아닙니다", "Mixamo에서 FBX Binary로 다시 받아 주세요."],
        ["클립은 최대 4개", "클립 수를 4개 이하로 줄여 주세요."],
        ["대기열이 가득 찼습니다", "잠시 뒤에 다시 보내 주세요."],
      ]} />
      <h3>처리가 실패했을 때</h3>
      <p>결과 페이지에 실패 메시지가 보이면 그림을 바꿔 다시 시도해 주세요. 실패는 대부분 그림 조건 때문입니다.</p>
      <ul><li>캐릭터가 한 명인지, 배경이 단색인지 확인</li><li>팔과 다리가 몸에서 떨어져 있는지 확인</li><li>정면 그림인지 확인</li></ul>
      <p>“처리 중 연결이 끊겼습니다”는 작업실 PC 쪽 문제입니다. 같은 그림을 다시 보내 주세요.</p>
      <h3>스튜디오에서 이상하게 보일 때</h3>
      <Table head={["증상", "확인할 것"]} rows={[
        ["Import 버튼이 눌리지 않음", <>메인 FBX(<Ui>FBX 받기</Ui>)를 골랐는지 확인. GLB는 가져올 수 없습니다.</>],
        ["캐릭터가 너무 크거나 작음", <>Scale Unit이 <Ui>Meter</Ui>인지 확인.</>],
        ["캐릭터가 투명하거나 텍스처가 없음", <>Home 탭 <Ui>Import</Ui>로 가져왔는지 확인.</>],
        ["멀리서 움직임이 뭉개짐", <><code>RenderFidelity</code>를 <Ui>Precise</Ui>로.</>],
        ["손가락이 벌어진 채 붙어 움직임", <>그림 손 모양 문제입니다. <a href="#fingers">손가락과 손</a>을 참고해 다시 그려 보세요.</>],
      ]} />
    </> },
    { id: "limits", title: "제한 한눈에", body: <Table head={["항목", "값"]} rows={[
      ["그림 형식 / 크기", "PNG · JPG · WEBP / 10MB 이하"], ["그림당 대상", "1개 (캐릭터 1명, 물체 1개, 장치 1대)"], ["애니메이션 클립 (캐릭터)", "그림당 최대 4개 · 파일당 10MB 이하"],
      ["기본 제공 클립", "Walking · Salute"], ["처리 시간 (시작 후)", "바닥 1분 · 캐릭터·물체 4~10분 · 장치 10~15분"], ["동시 처리", "한 번에 1개 (차례대로)"],
      ["물체·장치 높이", "10~2000cm (기본 120 / 200)"], ["바닥 한 변 · 무늬 반복", "100~2040cm · 1~16회"],
      ["결과 모델", "메시 1개 · 삼각형 약 8,000개 · 텍스처 512px"], ["손가락 본", "자동 (가능할 때 한 손 15개)"],
    ]} /> },
    { id: "privacy", title: "공개와 삭제", body: <>
      <p>보낸 그림과 결과 페이지는 <b>링크를 아는 사람 누구나</b> 열고 파일을 내려받을 수 있습니다. 직접 그렸거나 권리가 있는 그림만 보내 주세요.</p>
      <p>결과를 내리고 싶으면 초대 코드를 받은 곳에 결과 페이지 링크를 알려 주세요.</p>
    </> },
  ],
  footer: "2026년 10월 기준.",
};

const EN: Guide = {
  toc: "Contents",
  kicker: "FBX Studio · Guide",
  title: "Make an OVERDARE FBX from one drawing",
  lede: "Upload a drawing and we turn it into a 3D model and return an FBX you can bring straight into OVERDARE Studio. Characters get a skeleton and animation; static objects, mechanisms, and ground come as skeleton-free FBX files.",
  facts: [["You need", "Invite code + 1 drawing"], ["Time (once started)", "Ground 1 min · character/object 4–10 min · mechanism 10–15 min"], ["You get", "FBX · GLB (plus clip FBXs for characters)"]],
  sections: [
    { id: "what", title: "What it makes", body: <>
      <p>Your drawing is processed on one studio PC (one GPU) in the order below. Drawings are handled one at a time, so if others are ahead of yours, it waits its turn.</p>
      <ol className="fg-pipe" aria-label="Processing order">{["Prepare drawing", "Build 3D shape", "Check mesh", "Fit skeleton", "Prepare for engine", "Add animation", "Upload files"].map((s, i) => <li key={s}><b>{i + 1}</b>{s}</li>)}</ol>
      <p>The FBX holds <b>one mesh, a skeleton, and one animation</b>. The skeleton follows the bone names and structure of the OVERDARE default character (ODA). If the fingers are clearly separated in the drawing, finger bones are added too (<a href="#fingers">Fingers and hands</a>).</p>
    </> },
    { id: "kinds", title: "Four things you can make", body: <>
      <p>Choose one under <Ui>Type</Ui> at the top of the Create page. Only characters get a skeleton and animation; the other three are shape-only FBX files.</p>
      <Table head={["Type", "Examples", "Picking the drawing", "You get", "In the studio"]} rows={[
        [<b key="c">Character</b>, "People, animals, mascots", "One character, front view, arms away from the body (see Picking a good drawing)", "FBX (mesh + skeleton + motion) · clip FBXs · GLB", "Import, play, and edit"],
        [<b key="s">Static object</b>, "Trees, tables, crates, barricades", "One object, an angle that shows its shape, plain background", "1 FBX (no skeleton, origin at floor center)", "Import and set Anchored"],
        [<b key="m">Mechanism</b>, "Turrets, turntables, cranes", "A side or front view where the line between base and top is level", "Base FBX + top FBX (top origin = pivot)", "Group the two parts and turn the top with a script"],
        [<b key="g">Ground</b>, "Tile, dirt, or stone patterns", "A top-down pattern. The center square is used", "1 flat ground FBX (up to 2040 cm per side)", "Place several tiles for a large floor"],
      ]} />
      <h3>Settings for the other types</h3>
      <ul>
        <li><b>Static object</b>: <Ui>Height (cm)</Ui>, the total height in the studio. Default 120 cm.</li>
        <li><b>Mechanism</b>: <Ui>Total height (cm)</Ui> (default 200 cm), <Ui>Split height</Ui>, and <Ui>Which way the mechanism faces in the drawing</Ui>. Drag the dashed line on the drawing to the border between base and top; the top turns around that height.</li>
        <li><b>Ground</b>: <Ui>Tile side (cm)</Ui> (default 2000 cm) and <Ui>Pattern repeats</Ui>. For small tiling patterns, 4 to 8 repeats the pattern more densely.</li>
      </ul>
      <Callout tone="warn" title="Newly opened types"><p>Static objects, mechanisms, and ground are new. How skeleton-free FBX files import into the studio is still being checked, so these parts of the guide may change.</p></Callout>
    </> },
    { id: "why", title: "Why Mixamo motion and OVERDARE editing both work", body: <>
      <p>AI-made character FBXs usually get stuck on one side: with Mixamo motion they are hard to edit in the studio, and when built for the studio they cannot use Mixamo’s motion library. The final conversion step reconciles both in one file.</p>
      <Table head={["What you can do", "How it works"]} rows={[
        [<b key="a">Use Mixamo motion as is</b>, "Mixamo clips are recalculated for the OVERDARE skeleton and baked in. Each body part follows the direction it had in Mixamo, and foot height is corrected so feet do not float or sink because of height differences."],
        [<b key="b">Edit in the studio animation editor</b>, "Bone names, hierarchy, and every bone’s axes match the official OVERDARE reference character. Only positions are fitted to this character, so rotating a bone in the editor moves it the same way as on the default character."],
        [<b key="c">Copy other OVERDARE animations</b>, "The rest pose (arms down, A-pose) is re-posed to the reference angles and baked into the mesh. Because the starting pose matches, copied animations do not throw the arms and legs off."],
        [<b key="d">Finger motion</b>, "The OVERDARE default skeleton has no finger bones, so fingers are added under the hand bones with Mixamo names. Finger motion such as fists or a salute follows along, and the palm direction is aligned in the rest pose."],
        [<b key="e">A format the studio accepts</b>, "One mesh, at most 4 bones per vertex, Latin bone names, Z-up, centimeters, embedded texture, in-place motion, static frames trimmed. Everything OVERDARE blocks or warns about is handled before export."],
      ]} />
      <Callout tone="warn" title="Not there yet"><p>The bone structure matches the OVERDARE default character, but the studio recognizes it as a <b>Custom Skeleton</b>, not the official ODA Rig. Fingers do not move when you copy other OVERDARE animations (those animations have no finger keys).</p></Callout>
    </> },
    { id: "drawing", title: "Picking a good drawing", body: <>
      <p>Most of the result’s quality is decided by the drawing. The closer you get to the points below, the fewer failures and the more natural the motion.</p>
      <div className="fg-pair">
        <div className="fg-card good"><h4><span className="fg-badge">GOOD</span> Draw it like this</h4><GoodFigure label="A character facing forward with arms away from the body" /><ul>
          <li><b>One</b> character, facing <b>forward</b></li><li>Arms angled away from the body (A-pose)</li><li>Legs slightly apart, not touching</li><li><b>Plain background</b></li><li>Five fingers <b>straight, side by side with thin gaps</b></li>
        </ul></div>
        <div className="fg-card bad"><h4><span className="fg-badge">AVOID</span> These often fail</h4><BadFigure label="A character with arms against the body and fingers spread wide" /><ul>
          <li>Several characters in one drawing</li><li>Busy background, text, or patterns</li><li>Arms against the body or hidden behind it</li><li>Side view or an angled view</li><li>Fingers <b>spread like a fan</b>, fists, or hooked fingers</li>
        </ul></div>
      </div>
      <Callout title="Big-headed characters work too"><p>Cute characters whose head is more than a third of their height are supported. Their hands are often stubby, so finger bones are usually not added.</p></Callout>
      <p>Files must be <Ui>PNG</Ui> <Ui>JPG</Ui> <Ui>WEBP</Ui>, <b>10 MB or less</b>.</p>
    </> },
    { id: "send", title: "Sending a drawing", body: <>
      <p>Use the <Link href="/ko/fbx/create">Create</Link> page from the top menu.</p>
      <Steps items={[
        <p key="0">Pick what to make under <Ui>Type</Ui> (<a href="#kinds">Four things you can make</a>).</p>,
        <><p>Enter your invite code in <Ui>Invite code</Ui>.</p><p>This browser remembers it. Opening an invite link fills it in automatically.</p></>,
        <p key="2">Drop the drawing into <Ui>Drawing</Ui> or pick it with <Ui>Choose a file</Ui>.</p>,
        <><p>For a <b>character</b>, pick the animations in <Ui>Clips to include</Ui>. <b>Walking</b> and <b>Salute</b> are available by default. Other types show <Ui>Size and settings</Ui> here instead.</p><ul>
          <li>To use your own Mixamo motion, use <Ui>Add a Mixamo FBX clip</Ui> and upload a file downloaded from Mixamo as <b>FBX Binary · With Skin · 30 fps</b>.</li>
          <li>Up to <b>4 clips</b> per drawing, <b>10 MB or less</b> each.</li>
          <li>With two or more clips, choose which goes into the main FBX in <Ui>Clip to use in the main FBX</Ui>. The others come as separate clip FBXs.</li>
        </ul></>,
        <p key="4">Read and tick the consent box. It says the drawing and result go on <b>a page anyone with the link can open</b> (<a href="#privacy">Sharing and removal</a>).</p>,
        <p key="5">Press <Ui>Send the drawing</Ui> to go to the result page.</p>,
      ]} />
      <Callout title="Sending the same drawing again"><p>You are taken straight to the existing result page. Nothing is rebuilt, so there is no wait.</p></Callout>
    </> },
    { id: "wait", title: "Following progress", body: <>
      <p>The result page refreshes itself. Processing continues after you close it, so copy the address with <Ui>Copy link</Ui> and open it later. Drawings sent from this browser also appear under <b>Your creations</b> on the <Link href="/ko/fbx/assets">Assets</Link> page.</p>
      <Table head={["On screen", "Meaning"]} rows={[
        [<Ui key="a">Waiting for the studio PC</Ui>, "Waiting in line. The number ahead of yours is shown too."],
        [<Ui key="b">Building the 3D shape</Ui>, "Building the 3D shape from the drawing. The longest step."],
        [<Ui key="c">Fitting the skeleton</Ui>, "Fitting the skeleton. Retries automatically if it does not fit."],
        [<Ui key="d">Preparing it for the engine</Ui>, "Matching OVERDARE’s rules (size, bone names, bones per vertex)."],
        [<Ui key="e">Adding the animation</Ui>, "Checking fingers and adding the chosen motion."],
        [<Ui key="x">Writing the FBX</Ui>, "Other types: setting size and origin and exporting the FBX."],
        [<Ui key="f">Uploading your files</Ui>, "Uploading the result. Almost done."],
      ]} />
      <Callout tone="warn" title="If you see “The studio PC is offline”"><p>The studio PC is briefly off. Your drawing stays in the queue and is processed in order when the PC is back. No need to send it again.</p></Callout>
    </> },
    { id: "files", title: "Getting the files", body: <>
      <p>When processing finishes, the result page shows a 3D preview and download buttons.</p>
      <Table head={["Button", "Contains", "Use it when"]} rows={[
        [<Ui key="a">Download FBX</Ui>, "Mesh + skeleton + one main animation", "The file to bring into the studio"],
        [<><Ui>Download Walking clip</Ui> etc.</>, "The same character + that one motion", "You want several motions. The one matching the main FBX is marked “also in the main FBX”"],
        [<Ui key="c">Download GLB preview</Ui>, "Textured 3D model (no skeleton)", "Checking the shape or viewing in other tools"],
        [<Ui key="p">Download Base part FBX (fixed)</Ui>, "The mechanism's base", "Place it in the studio"],
        [<Ui key="q">Download Top part FBX (moving)</Ui>, "The mechanism's top. Its origin is the pivot", "Group with the base and rotate with a script"],
      ]} />
      <p>Static objects and ground come as a single <Ui>Download FBX</Ui>.</p>
      <p>Rename a result by typing in <Ui>Title</Ui> and pressing <Ui>Save title</Ui>. There are no accounts, so only <b>the browser that sent the drawing</b> can rename it.</p>
    </> },
    { id: "import", title: "Importing into OVERDARE", body: <>
      <Steps items={[
        <p key="1">Press <Ui>Import</Ui> on the <b>Home</b> tab of OVERDARE Studio. (It has to be Import, not Import3D or BulkImport, for the texture to connect automatically.)</p>,
        <p key="2">Choose the downloaded FBX.</p>,
        <p key="3">In Import Settings set <b>Scale Unit</b> to <Ui>Meter</Ui> and leave <Ui>Import Only as Model</Ui> <b>off</b>.</p>,
        <p key="4">After importing, set the character’s <code>RenderFidelity</code> to <Ui>Precise</Ui>. With Automatic, detail can blur at a distance and motion may look off.</p>,
      ]} />
      <Callout title="Other types"><p>Static object, mechanism, and ground FBX files have no skeleton or animation. Units are centimeters; static objects and ground have their origin at the floor center, and the mechanism's top part has its origin at the pivot. The import settings and results are still being checked.</p></Callout>
      <Callout title="Good to know"><p>The character is recognized as a <b>Custom Skeleton</b>. Bone names and structure follow the OVERDARE default character, but the studio does not classify it as the official ODA Rig.</p><p>All motion is <b>in place</b>. Move the character forward with scripts.</p></Callout>
    </> },
    { id: "fingers", title: "Fingers and hands", body: <>
      <p>Whether finger bones are added is decided <b>automatically</b> from the hands in the drawing. Hands with clearly separated fingertips get 3 joints per finger (15 per hand), and finger motion in the chosen animation (fists, salute, etc.) follows along.</p>
      <h3>When finger bones are not added</h3>
      <ul><li>Stubby hands or fingers stuck together (common in big-headed characters)</li><li>Hooked fingers</li><li>If bending the fingers would tear the hand, a hand without fingers is exported instead of a broken one</li></ul>
      <p>Without finger bones the character still moves normally; the hand moves as one piece with the wrist.</p>
      <Callout title="To keep the fingers"><p>Draw the five fingers straight and side by side with thin gaps between them. Fingers spread wide like a fan look webbed during motion.</p></Callout>
    </> },
    { id: "trouble", title: "Troubleshooting", body: <>
      <h3>Messages before sending (shown in Korean)</h3>
      <Table head={["Message", "Fix"]} rows={[
        ["초대코드가 올바르지 않습니다 (invalid invite code)", "Re-enter the code without spaces before or after."],
        ["이미지는 10MB 이하 (image over 10 MB)", "Shrink the drawing or save it as JPG/WEBP."],
        ["PNG·JPG·WEBP 만 받습니다 (unsupported format)", "Convert other formats (HEIC, GIF, …) to PNG."],
        ["클립 FBX 는 10MB 이하 / FBX 파일이 아닙니다 (clip too large / not FBX)", "Download it again from Mixamo as FBX Binary."],
        ["클립은 최대 4개 (too many clips)", "Use 4 clips or fewer."],
        ["대기열이 가득 찼습니다 (queue full)", "Try again a little later."],
      ]} />
      <h3>When processing fails</h3>
      <p>If the result page shows a failure message, try a different drawing. Most failures come from the drawing.</p>
      <ul><li>One character, plain background</li><li>Arms and legs apart from the body</li><li>A front view</li></ul>
      <p>“처리 중 연결이 끊겼습니다” (connection lost during processing) is a studio PC issue. Send the same drawing again.</p>
      <h3>When it looks wrong in the studio</h3>
      <Table head={["Symptom", "Check"]} rows={[
        ["Import button is disabled", <>Did you choose the main FBX (<Ui>Download FBX</Ui>)? GLB cannot be imported.</>],
        ["Character is too big or small", <>Scale Unit should be <Ui>Meter</Ui>.</>],
        ["Character is transparent or untextured", <>Import it with the Home tab <Ui>Import</Ui> button.</>],
        ["Motion blurs at a distance", <>Set <code>RenderFidelity</code> to <Ui>Precise</Ui>.</>],
        ["Fingers move spread apart and stuck", <>It comes from the drawn hand shape. See <a href="#fingers">Fingers and hands</a>.</>],
      ]} />
    </> },
    { id: "limits", title: "Limits at a glance", body: <Table head={["Item", "Value"]} rows={[
      ["Drawing format / size", "PNG · JPG · WEBP / 10 MB or less"], ["Subjects per drawing", "1 (one character, object, or mechanism)"], ["Animation clips (characters)", "Up to 4 per drawing · 10 MB each"],
      ["Built-in clips", "Walking · Salute"], ["Time (once started)", "Ground 1 min · character/object 4–10 min · mechanism 10–15 min"], ["Concurrency", "One at a time (in order)"],
      ["Object / mechanism height", "10–2000 cm (default 120 / 200)"], ["Ground side · pattern repeats", "100–2040 cm · 1–16"],
      ["Result model", "1 mesh · about 8,000 triangles · 512 px texture"], ["Finger bones", "Automatic (15 per hand when possible)"],
    ]} /> },
    { id: "privacy", title: "Sharing and removal", body: <>
      <p>Anyone <b>with the link</b> can open the drawing’s result page and download the files. Only send drawings you made or have the rights to.</p>
      <p>To take a result down, send the result page link to whoever gave you the invite code.</p>
    </> },
  ],
  footer: "As of October 2026.",
};

export function FbxGuideView({ lang }: { lang: UiLang }) {
  const g = lang === "ko" ? KO : EN;
  return <div className="product-container fg-wrap">
    <nav className="fg-toc" aria-label={g.toc}><p>{g.toc}</p><ol>{g.sections.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol></nav>
    <div className="fg-main">
      <header className="fg-top">
        <p className="eyebrow">{g.kicker}</p>
        <h1>{g.title}</h1>
        <p className="fg-lede">{g.lede}</p>
        <div className="fg-facts">{g.facts.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>
      </header>
      {g.sections.map(s => <section key={s.id} id={s.id} className="fg-section"><h2>{s.title}</h2>{s.body}</section>)}
      <p className="small-note fg-footer">{g.footer}</p>
    </div>
  </div>;
}
