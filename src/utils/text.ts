import DOMPurify from "dompurify";
import React from "react";

export function processText(input: string): string {
  const linkRegex = /(qortal:\/\/\S+)/g;

  function processNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent ?? "";
      const parts = textContent.split(linkRegex);

      if (parts.length > 0) {
        const fragment = document.createDocumentFragment();

        parts.forEach((part) => {
          if (part.startsWith("qortal://")) {
            const link = document.createElement("span");
            link.setAttribute("data-url", part);
            link.textContent = part;
            link.style.color = "#8ab4f8";
            link.style.textDecoration = "underline";
            link.style.cursor = "pointer";
            fragment.appendChild(link);
          } else {
            fragment.appendChild(document.createTextNode(part));
          }
        });

        // ✅ Ensure node is a ChildNode before calling replaceWith
        const parent = node.parentNode;
        if (parent) {
          parent.replaceChild(fragment, node);
        }
      }
    } else {
      Array.from(node.childNodes).forEach(processNode);
    }
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = input;
  processNode(wrapper);

  return wrapper.innerHTML;
}

export const sanitizedContent = (htmlContent: string) => {
  return DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: [
      "a",
      "b",
      "i",
      "em",
      "strong",
      "p",
      "br",
      "div",
      "span",
      "img",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "blockquote",
      "code",
      "pre",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "s",
      "hr",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "class",
      "src",
      "alt",
      "title",
      "width",
      "height",
      "style",
      "align",
      "valign",
      "colspan",
      "rowspan",
      "border",
      "cellpadding",
      "cellspacing",
      "data-url",
    ],
  }).replace(
    /<span[^>]*data-url="qortal:\/\/use-embed\/[^"]*"[^>]*>.*?<\/span>/g,
    ""
  );
};

export const extractComponents = (url: string) => {
  if (!url || !url.startsWith("qortal://")) {
    return null;
  }

  // Skip links starting with "qortal://use-"
  if (url.startsWith("qortal://use-")) {
    return null;
  }

  url = url.replace(/^(qortal\:\/\/)/, "");
  if (url.includes("/")) {
    let parts = url.split("/");
    const service = parts[0].toUpperCase();
    parts.shift();
    const name = parts[0];
    parts.shift();
    let identifier;
    const path = parts.join("/");
    return { service, name, identifier, path };
  }

  return null;
};

export const handleClickText = async (e: React.MouseEvent<HTMLElement>) => {
  e.preventDefault();
  const target = e.target as HTMLElement;
  if (target.getAttribute("data-url")) {
    const url = target.getAttribute("data-url");
    if (!url) return;
    let copyUrl: string = url;

    try {
      copyUrl = copyUrl?.replace(/^(qortal:\/\/)/, "");
      if (copyUrl && copyUrl?.startsWith("use-")) {
        // Handle the new 'use' format
        const parts = copyUrl.split("/");
        parts.shift();
        const action = parts.length > 0 ? parts[0].split("-")[1] : null; // e.g., 'invite' from 'action-invite'
        parts.shift();
        const id = parts.length > 0 ? parts[0].split("-")[1] : null; // e.g., '321' from 'groupid-321'
        if (action === "join" && id) {
          e.stopPropagation();
          qortalRequest({
            action: "JOIN_GROUP",
            groupId: +id,
          });
          return;
        }
      }
    } catch (error) {
      //error
    }
    const res = extractComponents(url);
    if (res) {
      e.stopPropagation();
      qortalRequest({
        action: "OPEN_NEW_TAB",
        qortalLink: url,
      });
    }
  }
};
