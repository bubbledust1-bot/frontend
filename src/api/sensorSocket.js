/**
 * 传感器 WebSocket：后端使用 send_text 发送 JSON 字符串，
 * 本模块在 onmessage 中统一 JSON.parse(event.data) 后再回调。
 */

import { getSensorWebSocketUrl } from "./config.js";

/**
 * 创建传感器 WebSocket 连接。
 *
 * @param {{
 *   onOpen?: () => void,
 *   onClose?: () => void,
 *   onError?: (ev: Event) => void,
 *   onParsedMessage?: (data: Record<string, unknown>) => void,
 * }} handlers
 * @returns {{ connect: () => void, disconnect: () => void, socket: WebSocket | null }}
 */
export function createSensorSocket(handlers = {}) {
  let socket = null;

  function disconnect() {
    if (socket) {
      socket.close();
      socket = null;
    }
  }

  function connect() {
    disconnect();
    const url = getSensorWebSocketUrl();
    socket = new WebSocket(url);

    socket.onopen = () => {
      handlers.onOpen?.();
    };

    socket.onclose = () => {
      handlers.onClose?.();
    };

    socket.onerror = (ev) => {
      handlers.onError?.(ev);
    };

    socket.onmessage = (event) => {
      try {
        const raw = event.data;
        const data = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(String(raw));
        handlers.onParsedMessage?.(data);
      } catch (e) {
        console.error("WebSocket 消息 JSON 解析失败：", e, event.data);
      }
    };
  }

  return { connect, disconnect, get socket() {
    return socket;
  } };
}
