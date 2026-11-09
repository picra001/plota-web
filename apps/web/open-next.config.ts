import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// 이 사이트는 정적 생성(SSG)뿐이고 재검증(ISR)을 쓰지 않는다.
// 빌드 때 만든 페이지를 Workers 정적 에셋에서 그대로 읽게 한다(R2·KV 같은 별도 저장소 불필요).
// 이 설정이 없으면 dynamicParams=false 인 Devlog 글·제품 페이지가 Cloudflare 에서 404 가 난다.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
