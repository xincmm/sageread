import {
  DISABLE_DOUBLE_CLICK_ON_MOBILE,
  DOUBLE_CLICK_INTERVAL_THRESHOLD_MS,
  LONG_HOLD_THRESHOLD,
} from "@/services/constants";
import { eventDispatcher } from "@/utils/event";
import { getOSPlatform } from "@/utils/misc";

const doubleClickEnabled = !DISABLE_DOUBLE_CLICK_ON_MOBILE || !["android", "ios"].includes(getOSPlatform());

let lastClickTime = 0;
let longHoldTimeout: ReturnType<typeof setTimeout> | null = null;

export const handleKeydown = (bookId: string, event: KeyboardEvent) => {
  if (["Backspace", "ArrowDown", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
  }
  window.postMessage(
    {
      type: "iframe-keydown",
      bookId,
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    },
    "*",
  );
};

export const handleMousedown = (bookId: string, event: MouseEvent) => {
  longHoldTimeout = setTimeout(() => {
    longHoldTimeout = null;
  }, LONG_HOLD_THRESHOLD);

  window.postMessage(
    {
      type: "iframe-mousedown",
      bookId,
      button: event.button,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.offsetX,
      offsetY: event.offsetY,
    },
    "*",
  );
};

export const handleMouseup = (bookId: string, event: MouseEvent) => {
  // we will handle mouse back and forward buttons ourselves
  if ([3, 4].includes(event.button)) {
    event.preventDefault();
  }

  window.postMessage(
    {
      type: "iframe-mouseup",
      bookId,
      button: event.button,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.offsetX,
      offsetY: event.offsetY,
    },
    "*",
  );
};

export const handleMouseMove = (bookId: string, event: MouseEvent) => {
  window.postMessage(
    {
      type: "iframe-mousemove",
      bookId,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.offsetX,
      offsetY: event.offsetY,
    },
    "*",
  );
};

export const handleWheel = (bookId: string, event: WheelEvent) => {
  window.postMessage(
    {
      type: "iframe-wheel",
      bookId,
      deltaMode: event.deltaMode,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      screenX: event.screenX,
      screenY: event.screenY,
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: event.offsetX,
      offsetY: event.offsetY,
    },
    "*",
  );
};

export const handleClick = (bookId: string, event: MouseEvent) => {
  const now = Date.now();

  if (doubleClickEnabled && now - lastClickTime < DOUBLE_CLICK_INTERVAL_THRESHOLD_MS) {
    lastClickTime = now;
    window.postMessage(
      {
        type: "iframe-double-click",
        bookId,
        screenX: event.screenX,
        screenY: event.screenY,
        clientX: event.clientX,
        clientY: event.clientY,
        offsetX: event.offsetX,
        offsetY: event.offsetY,
      },
      "*",
    );
    return;
  }

  lastClickTime = now;

  const postSingleClick = () => {
    let element: HTMLElement | null = event.target as HTMLElement;
    while (element) {
      if (["sup", "a", "audio", "video"].includes(element.tagName.toLowerCase())) {
        return;
      }
      if (element.classList.contains("js_readerFooterNote") || element.classList.contains("zhangyue-footnote")) {
        eventDispatcher.dispatch("footnote-popup", {
          bookId,
          element,
          footnote: element.getAttribute("data-wr-footernote") || element.getAttribute("zy-footnote") || "",
        });
        return;
      }
      element = element.parentElement;
    }

    // if long hold is detected, we don't want to send single click event
    if (!longHoldTimeout) {
      return;
    }

    window.postMessage(
      {
        type: "iframe-single-click",
        bookId,
        screenX: event.screenX,
        screenY: event.screenY,
        clientX: event.clientX,
        clientY: event.clientY,
        offsetX: event.offsetX,
        offsetY: event.offsetY,
      },
      "*",
    );
  };
  if (doubleClickEnabled) {
    setTimeout(() => {
      if (Date.now() - lastClickTime >= DOUBLE_CLICK_INTERVAL_THRESHOLD_MS) {
        postSingleClick();
      }
    }, DOUBLE_CLICK_INTERVAL_THRESHOLD_MS);
  } else {
    postSingleClick();
  }
};

const handleTouchEv = (bookId: string, event: TouchEvent, type: string) => {
  const touch = event.targetTouches[0];
  const touches = [];
  if (touch) {
    touches.push({
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
    });
  }
  window.postMessage(
    {
      type: type,
      bookId,
      targetTouches: touches,
    },
    "*",
  );
};

export const handleTouchStart = (bookId: string, event: TouchEvent) => {
  handleTouchEv(bookId, event, "iframe-touchstart");
};

export const handleTouchMove = (bookId: string, event: TouchEvent) => {
  handleTouchEv(bookId, event, "iframe-touchmove");
};

export const handleTouchEnd = (bookId: string, event: TouchEvent) => {
  handleTouchEv(bookId, event, "iframe-touchend");
};
