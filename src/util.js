// references from devshed
function validURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
  return !!pattern.test(str);
}

export function number2Pixel(num) {
  if (typeof num === "number") return `${num}px`;
  const t = num * 1;
  if (!isNaN(t)) return `${num}px`;
  if (typeof num !== "string") return "";
  if (/px|em|rem$/i.test(num)) return num;

  return num.replace(/[^\d\.]+/, "") + "px";
}

// https://muffinman.io/javascript-get-element-offset/
export function getElementPos(el) {
  let pos = {top: 0, left: 0};
  if (!(el instanceof HTMLElement)) return pos;
  const elRect = el.getBoundingClientRect();
  while (el) {
    pos.top += el.offsetTop;
    pos.left += el.offsetLeft;
    el = el.offsetParent;
  }

  const dtop = pos.top - elRect.top;
  const dleft = pos.left - elRect.left;

  return {
    top: dtop < 0 ? (pos.top + Math.abs(dtop)):(pos.top - Math.abs(dtop)),
    left: dleft < 0 ? (pos.left + Math.abs(dleft)):(pos.left - Math.abs(dleft))
  };
}

export function isUrl(url) {
  if (typeof url !== "string") return false;
  if (validURL(url)) return true;
  if (url.indexOf("/") !== -1) return true;

  return false;
}

export function isCSSColor(color) {
  if (color instanceof CanvasGradient) return true;
  if (typeof color !== "string") return false;

  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color);
}

export function loadImage(imgUri) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "";
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`The image ${imgUri} can not be loaded.`));
    };
    img.src = imgUri;
  });
}

export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent);
}

export function mouseClickType(evt) {
  if (evt.buttons && evt.buttons !== 1) return 2;
  let btnKey = evt.which || evt.button;
  if (btnKey !== 1) return 2;

  return 1;
}

export function isAppleMac() {
  return navigator.platform.toLocaleLowerCase().indexOf("mac") !== -1;
}
