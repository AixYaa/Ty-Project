import { ref } from 'vue';

export function useWatermark(appendEl: HTMLElement | null = document.body) {
  const id = '1.2.3.4.5.6';
  const watermarkEl = ref<HTMLElement | null>(null);
  let intervalId: any = null;

  const resizeHandler = () => {
    const dom = document.getElementById(id);
    if (dom) {
      dom.style.width = document.documentElement.clientWidth + 'px';
      dom.style.height = document.documentElement.clientHeight + 'px';
    }
  };

  const clear = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    const domId = document.getElementById(id);
    if (domId) {
      const parent = domId.parentNode;
      if (parent) parent.removeChild(domId);
    }
    window.removeEventListener('resize', resizeHandler);
  };

  const createWatermark = (str: string) => {
    // Note: Do not call clear() here directly if we want to preserve interval
    // But for simplicity, we re-create DOM elements
    
    // Cleanup existing DOM but don't stop interval if we are just redrawing
    const domId = document.getElementById(id);
    if (domId) {
      const parent = domId.parentNode;
      if (parent) parent.removeChild(domId);
    }
    window.removeEventListener('resize', resizeHandler);

    const can = document.createElement('canvas');
    can.width = 300;
    can.height = 240;

    const cans = can.getContext('2d');
    if (cans) {
      cans.rotate((-20 * Math.PI) / 180);
      cans.font = '15px Vedana';
      cans.fillStyle = 'rgba(200, 200, 200, 0.20)';
      cans.textAlign = 'left';
      cans.textBaseline = 'middle';
      cans.fillText(str, can.width / 20, can.height);
    }

    const div = document.createElement('div');
    div.id = id;
    div.style.pointerEvents = 'none';
    div.style.top = '0px';
    div.style.left = '0px';
    div.style.position = 'fixed';
    div.style.zIndex = '100000';
    div.style.width = document.documentElement.clientWidth + 'px';
    div.style.height = document.documentElement.clientHeight + 'px';
    div.style.background = 'url(' + can.toDataURL('image/png') + ') left top repeat';
    
    if (appendEl) {
      appendEl.appendChild(div);
    } else {
      document.body.appendChild(div);
    }
    
    watermarkEl.value = div;

    window.addEventListener('resize', resizeHandler);
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  };

  const setWatermark = (str: string, showTime: boolean = false) => {
    // Clear previous interval if any
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    const draw = () => {
      let displayStr = str;
      if (showTime) {
        displayStr = `${str} ${formatDate(new Date())}`;
      }
      createWatermark(displayStr);
    };

    draw();

    if (showTime) {
      intervalId = setInterval(draw, 1000); // Update every second
    }
  };

  return { setWatermark, clear };
}
