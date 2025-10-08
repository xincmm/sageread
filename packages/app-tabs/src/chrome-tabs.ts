import Draggabilly from "draggabilly";
import { inBrowser, inRange, requestAnimationFrameAsync, sum } from "./utils/util";

const TAB_CONTENT_MARGIN = 4;
const TAB_CONTENT_OVERLAP_DISTANCE = -24;

const TAB_CONTENT_MIN_WIDTH = 60;
const TAB_CONTENT_MAX_WIDTH = 160;

const TAB_SIZE_SMALL = 84;
const TAB_SIZE_SMALLER = 60;
const TAB_SIZE_MINI = 48;

const noop = (_: any) => {};

const closest = (value: number, array: number[]) => {
  let closest = Number.POSITIVE_INFINITY;
  let closestIndex = -1;

  array.forEach((v, i) => {
    if (Math.abs(value - v) < closest) {
      closest = Math.abs(value - v);
      closestIndex = i;
    }
  });

  return closestIndex;
};

const tabTemplate = `
      <div class="chrome-tab">
        <div class="chrome-tab-dividers"></div>
        <div class="chrome-tab-background">
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg"><defs><symbol id="chrome-tab-geometry-left" viewBox="0 0 214 36"><path d="M17 0h197v36H0v-2c4.5 0 9-3.5 9-8V8c0-4.5 3.5-8 8-8z"/></symbol><symbol id="chrome-tab-geometry-right" viewBox="0 0 214 36"><use xlink:href="#chrome-tab-geometry-left"/></symbol><clipPath id="crop"><rect class="mask" width="100%" height="100%" x="0"/></clipPath></defs><svg width="52%" height="100%"><use xlink:href="#chrome-tab-geometry-left" width="214" height="36" class="chrome-tab-geometry"/></svg><g transform="scale(-1, 1)"><svg width="52%" height="100%" x="-100%" y="0"><use xlink:href="#chrome-tab-geometry-right" width="214" height="36" class="chrome-tab-geometry"/></svg></g></svg>
        </div>
        <div class="chrome-tab-content">
          <div class="chrome-tab-favicon"></div>
          <div class="chrome-tab-title"></div>
          <div class="chrome-tab-drag-handle"></div>
          <div class="chrome-tab-close"></div>
        </div>
      </div>
    `;

const defaultTapProperties = {
  title: "New tab",
  favicon: false,
};

export interface TabProperties {
  id: string;
  title: string;
  active?: boolean;
  favicon?: boolean | string;
  faviconClass?: string;
  isCloseIconVisible?: boolean;
}
inRange;

let instanceId = 0;

export interface ChromeTabsOptions {
  draggable?: boolean;
}

class ChromeTabs {
  el!: HTMLElement;
  styleEl!: HTMLStyleElement;
  instanceId?: number;
  draggabillies: Draggabilly[];
  isDragging: any;
  draggabillyDragging: any;
  isMouseEnter = false;
  mouseEnterLayoutResolve: null | (() => void) = null;

  private draggable = true;
  constructor({ draggable = true }: ChromeTabsOptions = {}) {
    this.draggabillies = [];
    this.draggable = draggable;
  }

  setDraggable(draggable: boolean) {
    this.draggable = draggable;
    if (draggable) {
      this.setupDraggabilly();
    } else {
      this.disposeDraggabilly();
    }
  }

  init(el: HTMLElement) {
    this.el = el;

    this.instanceId = instanceId;
    this.el.setAttribute("data-chrome-tabs-instance-id", `${this.instanceId}`);
    instanceId += 1;

    this.setupCustomProperties();
    this.setupStyleEl();
    this.setupEvents();
    this.layoutTabs();
    this.setDraggable(this.draggable);
  }

  emit(eventName: string, data: any) {
    this.el.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  setupCustomProperties() {
    this.el.style.setProperty("--tab-content-margin", `${TAB_CONTENT_MARGIN}px`);
  }

  setupStyleEl() {
    this.styleEl = document.createElement("style");
    this.el.appendChild(this.styleEl);
  }

  translateX = 0;
  setupEvents() {
    if (inBrowser()) {
      window.addEventListener("resize", this.onResize);
    }

    // this.el.addEventListener("dblclick", (event) => {
    //   if ([this.el, this.tabContentEl].includes(event.target as HTMLElement))
    //     this.addTab();
    // });

    this.el.addEventListener("mouseenter", () => {
      this.isMouseEnter = true;
    });

    this.el.addEventListener("mouseleave", this.onMouseLeave);
    // When the page visibility status changes, it is triggered immediately
    document.addEventListener("visibilitychange", this.onMouseLeave);

    this.tabEls.forEach((tabEl) => this.setTabCloseEventListener(tabEl));
    this.tabContentEl.addEventListener("wheel", (event) => {
      const tabsWidth = this.getTabsWidth();
      const clientWidth = this.tabContentEl.clientWidth;
      if (clientWidth >= tabsWidth) {
        this.translateX = 0;
      } else {
        const sign = event.deltaY > 0 ? 1 : -1;
        const delta = (sign * (tabsWidth - clientWidth)) / 3;
        this.translateX = Math.min(0, Math.max(this.translateX - delta, clientWidth - tabsWidth));
      }
      this.tabContentEl.style.transform = `translateX(${this.translateX}px)`;
    });
    this.el.addEventListener("activeTabChange", async () => {
      await this.layoutPromise; // Wait for the layout to finish
      this.translateToView();
    });
  }

  onResize = () => {
    this.cleanUpPreviouslyDraggedTabs();
    this.layoutTabs();
  };

  onMouseLeave = () => {
    this.isMouseEnter = false;
    if (this.mouseEnterLayoutResolve) {
      this.mouseEnterLayoutResolve();
      this.mouseEnterLayoutResolve = null;
    }
  };

  get tabEls() {
    return Array.prototype.slice.call(this.el.querySelectorAll(".chrome-tab"));
  }

  get tabContentEl() {
    return this.el.querySelector(".chrome-tabs-content")! as HTMLDivElement;
  }

  get toolbarEl() {
    return this.el.querySelector(".chrome-tabs-toolbar-right")!;
  }

  get toolbarLeftEl() {
    return this.el.querySelector(".chrome-tabs-toolbar-left");
  }

  get tabContentWidths() {
    const numberOfTabs = this.tabEls.length;
    const toolbarRightWidth = this.toolbarEl.clientWidth;
    const toolbarLeftWidth = this.toolbarLeftEl?.clientWidth || 0;
    const tabsContentWidth = this.el!.clientWidth - toolbarRightWidth - toolbarLeftWidth - 16;
    const tabsCumulativeOverlappedWidth = (numberOfTabs - 1) * TAB_CONTENT_OVERLAP_DISTANCE;
    const targetWidth = (tabsContentWidth - 2 * TAB_CONTENT_MARGIN + tabsCumulativeOverlappedWidth) / numberOfTabs;
    const clampedTargetWidth = Math.max(TAB_CONTENT_MIN_WIDTH, Math.min(TAB_CONTENT_MAX_WIDTH, targetWidth));
    const flooredClampedTargetWidth = Math.floor(clampedTargetWidth);
    const totalTabsWidthUsingTarget =
      flooredClampedTargetWidth * numberOfTabs + 2 * TAB_CONTENT_MARGIN - tabsCumulativeOverlappedWidth;
    const totalExtraWidthDueToFlooring = tabsContentWidth - totalTabsWidthUsingTarget;

    const widths = [];
    for (let i = 0; i < numberOfTabs; i += 1) {
      if (i === numberOfTabs - 1) {
        const extraWidth = flooredClampedTargetWidth < TAB_CONTENT_MAX_WIDTH ? totalExtraWidthDueToFlooring : 0;
        widths.push(flooredClampedTargetWidth + extraWidth);
      } else {
        widths.push(flooredClampedTargetWidth);
      }
    }

    return widths;
  }

  get tabContentPositions() {
    const positions: number[] = [];
    const tabContentWidths = this.tabContentWidths;

    let position = TAB_CONTENT_MARGIN;
    tabContentWidths.forEach((width, i) => {
      const offset = i * TAB_CONTENT_OVERLAP_DISTANCE;
      positions.push(position - offset);
      position += width;
    });

    return positions;
  }

  get tabPositions() {
    const positions: number[] = [];

    this.tabContentPositions.forEach((contentPosition) => {
      positions.push(contentPosition - TAB_CONTENT_MARGIN);
    });

    return positions;
  }

  async doLayout() {
    const tabContentWidths = this.tabContentWidths;
    this.tabEls.forEach((tabEl, i) => {
      const contentWidth = tabContentWidths[i];
      const width = contentWidth + 2 * TAB_CONTENT_MARGIN;

      tabEl.style.width = `${width}px`;
      tabEl.removeAttribute("is-small");
      tabEl.removeAttribute("is-smaller");
      tabEl.removeAttribute("is-mini");

      if (contentWidth < TAB_SIZE_SMALL) tabEl.setAttribute("is-small", "");
      if (contentWidth < TAB_SIZE_SMALLER) tabEl.setAttribute("is-smaller", "");
      if (contentWidth < TAB_SIZE_MINI) tabEl.setAttribute("is-mini", "");
    });

    let styleHTML = "";

    this.tabPositions.forEach((position, i) => {
      styleHTML += `
              .chrome-tabs[data-chrome-tabs-instance-id="${this.instanceId}"] .chrome-tab:nth-child(${i + 1}) {
                transform: translate3d(${position}px, 0, 0)
              }
            `;
    });
    this.styleEl.innerHTML = styleHTML;
    await this.justifyContentWidth();
  }

  layoutPromise = null as Promise<void> | null;
  layoutTabs() {
    this.layoutPromise = this.doLayout();
    return this.layoutPromise;
  }

  getTabsWidth() {
    const contentWidths = this.tabEls.map(
      (tabEl) => tabEl.querySelector(".chrome-tab-drag-handle").getBoundingClientRect().width,
    );
    const width = sum(...contentWidths);
    const contentWith = width + 8 - Math.max(contentWidths.length - 1, 0) * TAB_CONTENT_OVERLAP_DISTANCE;
    return contentWith;
  }

  async justifyContentWidth() {
    await requestAnimationFrameAsync();
    this.tabContentEl.style.width = `${this.getTabsWidth()}px`;
  }

  async translateToView() {
    await requestAnimationFrameAsync();
    const tabsWidth = this.getTabsWidth();
    const tabWidth = tabsWidth / this.tabEls.length;
    const clientWidth = this.tabContentEl.clientWidth;
    const index = this.tabEls.indexOf(this.activeTabEl);
    if (index === -1) return;
    if (clientWidth >= tabsWidth) {
      this.translateX = 0;
    } else {
      const currentX = index * tabWidth;
      const left = Math.max(-currentX, clientWidth - tabsWidth);
      const right = Math.max(-currentX + tabWidth, clientWidth - tabsWidth);
      const isInRange = inRange(this.translateX, left, right);
      this.translateX = Math.min(0, isInRange ? this.translateX : (left + right) / 2);
    }
    this.tabContentEl.style.transform = `translateX(${this.translateX}px)`;
  }

  createNewTabEl() {
    const div = document.createElement("div");
    div.innerHTML = tabTemplate;
    return div.firstElementChild;
  }

  addTab(tabProperties?: TabProperties, { animate = true, background = false } = {}) {
    const tabEl = this.createNewTabEl() as HTMLElement;
    tabEl.oncontextmenu = (event) => {
      this.emit("contextmenu", { tabEl, event });
    };
    tabEl.addEventListener("mousedown", () => {
      this.emit("tabClick", { tabEl });
    });
    if (animate) {
      tabEl.classList.add("chrome-tab-was-just-added");
      setTimeout(() => tabEl.classList.remove("chrome-tab-was-just-added"), 500);
    }

    tabProperties = Object.assign({}, defaultTapProperties, tabProperties);
    const showCloseButton = tabProperties.isCloseIconVisible !== false;
    if (!showCloseButton) {
      tabEl.classList.add("chrome-tab-no-close");
    } else {
      tabEl.classList.remove("chrome-tab-no-close");
    }
    this.tabContentEl.appendChild(tabEl);
    this.setTabCloseEventListener(tabEl);
    this.updateTab(tabEl, tabProperties);
    this.emit("tabAdd", { tabEl });
    if (!background) this.setCurrentTab(tabEl);
    this.cleanUpPreviouslyDraggedTabs();
    this.layoutTabs();
    this.setDraggable(this.draggable);
    return tabEl;
  }

  setTabCloseEventListener(tabEl: HTMLElement) {
    tabEl.querySelector(".chrome-tab-close")!.addEventListener("click", (_) => {
      _.stopImmediatePropagation();
      // this.removeTab(tabEl);
      this.emit("tabClose", { tabEl });
    });
  }

  get activeTabEl() {
    return this.el.querySelector(".chrome-tab[active]");
  }

  hasActiveTab() {
    return !!this.activeTabEl;
  }

  setCurrentTab(tabEl: HTMLElement) {
    const activeTabEl = this.activeTabEl;
    if (activeTabEl === tabEl) return;
    if (activeTabEl) activeTabEl.removeAttribute("active");
    tabEl.setAttribute("active", "");
    this.emit("activeTabChange", { tabEl });
  }

  removeTab(tabEl: HTMLElement) {
    if (tabEl === this.activeTabEl) {
      if (tabEl.nextElementSibling) {
        this.setCurrentTab(tabEl.nextElementSibling as HTMLElement);
      } else if (tabEl.previousElementSibling) {
        this.setCurrentTab(tabEl.previousElementSibling as HTMLElement);
      }
    }
    tabEl.parentNode!.removeChild(tabEl);
    this.emit("tabRemove", { tabEl });
    this.cleanUpPreviouslyDraggedTabs();
    this.layoutTabs().then(() => this.translateToView());
    this.setDraggable(this.draggable);
  }

  updateTab(tabEl: HTMLElement, tabProperties: TabProperties) {
    tabEl.querySelector(".chrome-tab-title")!.textContent = tabProperties.title;

    const faviconEl = tabEl.querySelector(".chrome-tab-favicon") as HTMLElement;
    const { favicon, faviconClass } = tabProperties;
    faviconEl.className = "chrome-tab-favicon";
    faviconEl!.style!.backgroundImage = "";
    if (favicon || faviconClass) {
      if (faviconClass) {
        faviconEl.className = ["chrome-tab-favicon", faviconClass].join(" ");
      }
      if (favicon) {
        faviconEl!.style!.backgroundImage = `url('${favicon}')`;
      }
      faviconEl?.removeAttribute("hidden");
    } else {
      faviconEl?.setAttribute("hidden", "");
      faviconEl?.removeAttribute("style");
    }

    if (tabProperties.id) {
      tabEl.setAttribute("data-tab-id", tabProperties.id);
    }
  }

  cleanUpPreviouslyDraggedTabs() {
    this.tabEls.forEach((tabEl) => tabEl.classList.remove("chrome-tab-was-just-dragged"));
  }

  disposeDraggabilly() {
    if (this.isDragging) {
      this.isDragging = false;
      this.el.classList.remove("chrome-tabs-is-sorting");
      this.draggabillyDragging.element.classList.remove("chrome-tab-is-dragging");
      this.draggabillyDragging.element.style.transform = "";
      this.draggabillyDragging.dragEnd();
      this.draggabillyDragging.isDragging = false;
      this.draggabillyDragging.positionDrag = noop; // Prevent Draggabilly from updating tabEl.style.transform in later frames
      this.draggabillyDragging.destroy();
      this.draggabillyDragging = null;
    }

    this.draggabillies.forEach((d) => d.destroy());
    this.draggabillies = [];
  }

  setupDraggabilly() {
    const tabEls = this.tabEls;
    const tabPositions = this.tabPositions;

    this.disposeDraggabilly();

    tabEls.forEach((tabEl: HTMLDivElement, originalIndex) => {
      const originalTabPositionX = tabPositions[originalIndex];
      const draggabilly = new Draggabilly(tabEl, {
        axis: "x",
        handle: ".chrome-tab-drag-handle",
        containment: false,
      });

      this.draggabillies.push(draggabilly);

      draggabilly.on("pointerDown", (_) => {
        this.emit("tabClick", { tabEl });
        // this.setCurrentTab(tabEl);
      });

      draggabilly.on("dragStart", (_) => {
        this.isDragging = true;
        this.draggabillyDragging = draggabilly;
        tabEl.classList.add("chrome-tab-is-dragging");
        this.el.classList.add("chrome-tabs-is-sorting");
        this.emit("dragStart", { tabEl });
      });

      draggabilly.on("dragEnd", (_) => {
        this.isDragging = false;
        const finalTranslateX = Number.parseFloat(tabEl.style.left);
        tabEl.style.transform = "translate3d(0, 0, 0)";
        this.emit("dragEnd", { tabEl });

        // Animate dragged tab back into its place
        requestAnimationFrame((_) => {
          tabEl.style.left = "0";
          tabEl.style.transform = `translate3d(${finalTranslateX}px, 0, 0)`;

          requestAnimationFrame((_) => {
            tabEl.classList.remove("chrome-tab-is-dragging");
            this.el.classList.remove("chrome-tabs-is-sorting");

            tabEl.classList.add("chrome-tab-was-just-dragged");

            requestAnimationFrame((_) => {
              tabEl.style.transform = "";
              this.layoutTabs();
              this.setDraggable(this.draggable);
            });
          });
        });
      });
      const handleDragMove = (event: any, pointer: any, moveVector: any) => {
        // Current index be computed within the event since it can change during the dragMove
        const tabEls = this.tabEls;
        const currentIndex = tabEls.indexOf(tabEl);
        const currentTabPositionX = originalTabPositionX + moveVector.x;
        const tabContent = tabEl.querySelector(".chrome-tab-content")!;
        const right = currentTabPositionX + tabContent.clientWidth;

        const overLeft = currentTabPositionX < -2;
        const overRight = right > this.tabContentEl.clientWidth;
        // trick to prevent the tab from being dragged out of the tab bar
        // @see https://github.com/desandro/draggabilly/issues/177#issuecomment-357270225
        if (overLeft || overRight) {
          draggabilly.off("dragMove", handleDragMove);
          let x: number;
          if (overLeft) {
            x = -originalTabPositionX;
          } else {
            const RADIUS = 8;
            const delta = right - this.tabContentEl.clientWidth + RADIUS;
            x = moveVector.x - delta;
          }
          (draggabilly as any)._dragMove(event as any, pointer, {
            x: x,
            y: 0,
          });

          draggabilly.on("dragMove", handleDragMove);
          return;
        }
        const destinationIndexTarget = closest(currentTabPositionX, tabPositions);
        const destinationIndex = Math.max(0, Math.min(tabEls.length, destinationIndexTarget));
        if (currentIndex !== destinationIndex) {
          this.animateTabMove(tabEl, currentIndex, destinationIndex);
        }
      };

      draggabilly.on("dragMove", handleDragMove);
    });
  }

  animateTabMove(tabEl: HTMLElement, originIndex: number, destinationIndex: number) {
    // tabEl.style.transform = `translate3d(${-this.translateX}px, 0, 0)`;
    if (destinationIndex < originIndex) {
      tabEl!.parentNode!.insertBefore(tabEl, this.tabEls[destinationIndex]);
    } else {
      tabEl!.parentNode!.insertBefore(tabEl, this.tabEls[destinationIndex + 1]);
    }
    this.emit("tabReorder", { tabEl, originIndex, destinationIndex });
    this.layoutTabs();
  }

  destroy() {
    if (inBrowser()) {
      window.removeEventListener("resize", this.onResize);
    }
    document.removeEventListener("visibilitychange", this.onMouseLeave);
  }
}

export default ChromeTabs;
