export type LabelMarkerKind = "stored" | "external";

export interface LabelMarkerHandle {
  element: HTMLDivElement;
  setSelected: (selected: boolean) => void;
}

const MAX_LABEL_WIDTH = 128;

/**
 * A compact labeled café chip for AdvancedMarkerElement's content
 * property, which accepts any DOM node, not just a PinElement. Built
 * with plain DOM APIs since this is imperative Maps API content, not
 * React-rendered. Returns a handle so the selection-highlight effect
 * can restyle an already-built marker in place rather than tearing
 * down and rebuilding the whole marker set every time selection
 * changes.
 */
export function buildLabelMarker(name: string, kind: LabelMarkerKind): LabelMarkerHandle {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.cursor = "pointer";

  const chip = document.createElement("div");
  chip.textContent = name;
  chip.style.maxWidth = `${MAX_LABEL_WIDTH}px`;
  chip.style.overflow = "hidden";
  chip.style.textOverflow = "ellipsis";
  chip.style.whiteSpace = "nowrap";
  chip.style.padding = "4px 10px";
  chip.style.borderRadius = "999px";
  chip.style.fontSize = "12px";
  chip.style.fontWeight = "600";
  chip.style.fontFamily = "Inter, system-ui, sans-serif";
  chip.style.borderWidth = "1.5px";
  chip.style.borderStyle = "solid";
  chip.style.boxShadow = "0 1px 3px rgba(43,43,43,0.22)";
  chip.style.transition = "background-color 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s";

  const pointer = document.createElement("div");
  pointer.style.width = "0";
  pointer.style.height = "0";
  pointer.style.borderLeft = "4px solid transparent";
  pointer.style.borderRight = "4px solid transparent";
  pointer.style.borderTop = "5px solid";
  pointer.style.marginTop = "-1px";
  pointer.style.transition = "border-top-color 0.15s";

  function setSelected(selected: boolean) {
    if (selected) {
      chip.style.backgroundColor = "#5B3A29";
      chip.style.color = "#FAF8F4";
      chip.style.borderColor = "#C99A3B";
      chip.style.boxShadow = "0 2px 8px rgba(43,43,43,0.35)";
      pointer.style.borderTopColor = "#5B3A29";
    } else if (kind === "stored") {
      chip.style.backgroundColor = "#FAF8F4";
      chip.style.color = "#5B3A29";
      chip.style.borderColor = "#5B3A29";
      chip.style.boxShadow = "0 1px 3px rgba(43,43,43,0.22)";
      pointer.style.borderTopColor = "#5B3A29";
    } else {
      chip.style.backgroundColor = "#FAF8F4";
      chip.style.color = "#6F8F72";
      chip.style.borderColor = "#6F8F72";
      chip.style.boxShadow = "0 1px 3px rgba(43,43,43,0.22)";
      pointer.style.borderTopColor = "#6F8F72";
    }
  }

  setSelected(false);
  wrapper.appendChild(chip);
  wrapper.appendChild(pointer);

  return { element: wrapper, setSelected };
}
