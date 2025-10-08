import { Transformer } from "markmap-lib";
import { Toolbar } from "markmap-toolbar";
import "markmap-toolbar/dist/style.css";
import { iframeService } from "@/services/iframe-service";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { Markmap } from "markmap-view";
import { memo, useEffect, useRef } from "react";

interface MindmapViewerProps {
  markdown: string;
}

const MindmapViewerComponent = ({ markdown }: MindmapViewerProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const toolbarInstanceRef = useRef<Toolbar | null>(null);

  useEffect(() => {
    if (!svgRef.current || !markdown || !toolbarRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (markmapRef.current && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        if (rect.width > 100) {
          markmapRef.current.fit();
        }
      }
    });

    if (svgRef.current.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    const handleContextMenu = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as SVGElement;
      let nodeElement = target;

      while (nodeElement && nodeElement.nodeName !== "g") {
        nodeElement = nodeElement.parentElement as unknown as SVGElement;
      }

      if (!nodeElement || !nodeElement.classList.contains("markmap-node")) {
        return;
      }

      const textElement = nodeElement.querySelector("foreignObject")?.textContent;
      const nodeText = textElement?.trim() || "";

      if (!nodeText) return;

      try {
        const menu = await Menu.new({
          items: [
            await MenuItem.new({
              id: "ask-ai",
              text: `询问 AI 关于"${nodeText.slice(0, 20)}${nodeText.length > 20 ? "..." : ""}"`,
              action: () => {
                iframeService.sendAskAIRequest(nodeText, `请解释：${nodeText}`);
              },
            }),
            await MenuItem.new({
              id: "copy",
              text: "复制节点内容",
              action: () => {
                navigator.clipboard.writeText(nodeText);
              },
            }),
          ],
        });

        await menu.popup();
      } catch (error) {
        console.error("Failed to show context menu:", error);
      }
    };

    try {
      const transformer = new Transformer();
      const { root } = transformer.transform(markdown);

      if (!markmapRef.current) {
        markmapRef.current = Markmap.create(
          svgRef.current,
          {
            maxWidth: 320,
            paddingX: 16,
            spacingVertical: 12,
            spacingHorizontal: 100,
            autoFit: true,
            duration: 300,
            color: (node: any) => {
              const depth = node.state?.depth || 0;
              const colors = ["#5B8FF9", "#5AD8A6", "#5D7092", "#F6BD16", "#E8684A", "#6DC8EC", "#9270CA"];
              return colors[depth % colors.length];
            },
            nodeMinHeight: 36,
          },
          root,
        );

        if (!toolbarInstanceRef.current && toolbarRef.current) {
          while (toolbarRef.current.firstChild) {
            toolbarRef.current.removeChild(toolbarRef.current.firstChild);
          }

          const toolbar = new Toolbar();
          toolbar.attach(markmapRef.current);
          toolbar.setItems(["zoomIn", "zoomOut", "fit"]);
          toolbarRef.current.append(toolbar.render());
          toolbarInstanceRef.current = toolbar;
        }

        if (svgRef.current) {
          svgRef.current.addEventListener("contextmenu", handleContextMenu);
        }
      } else {
        markmapRef.current.setData(root);
        markmapRef.current.fit();
        markmapRef.current.rescale(1.2);
      }
    } catch (error) {
      console.error("Failed to render markmap:", error);
    }

    return () => {
      resizeObserver.disconnect();
      if (svgRef.current) {
        svgRef.current.removeEventListener("contextmenu", handleContextMenu);
      }
      if (toolbarInstanceRef.current) {
        toolbarInstanceRef.current = null;
      }
      if (markmapRef.current) {
        markmapRef.current.destroy();
        markmapRef.current = null;
      }
    };
  }, [markdown]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden px-4 py-2">
        <div ref={toolbarRef} className="absolute right-4 bottom-4 z-10" />
        <svg
          ref={svgRef}
          className="h-full w-full"
          style={{
            backgroundColor: "transparent",
          }}
        />
      </div>
    </div>
  );
};

export const MindmapViewer = memo(MindmapViewerComponent);
