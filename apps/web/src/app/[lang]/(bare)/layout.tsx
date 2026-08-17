// 사이트 헤더·푸터를 따르지 않는 독립 화면용 그룹. <html>/<body>만 [lang] 레이아웃에서 상속한다.
export default function BareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
