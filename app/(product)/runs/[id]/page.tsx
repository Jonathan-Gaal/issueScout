import RunDetail from "../../../../components/RunDetail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RunDetail id={id} />; }
