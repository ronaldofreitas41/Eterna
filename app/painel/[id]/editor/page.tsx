import { loadWorkspace } from "@/lib/workspace-data";
import EditorWorkspace from "./EditorWorkspace";

export const metadata = { title: "Editor do site · Eterna" };

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding, design, versions, live } = await loadWorkspace(id);
  return <EditorWorkspace wedding={wedding} design={design} versions={versions} live={live} />;
}
