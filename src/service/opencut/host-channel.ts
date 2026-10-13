// In-window channel shared with OpenCut. Replaces iframe postMessage.

type Handler = (message: unknown) => void;

export type ScroOpenCutHost = {
  postToEditor: (message: unknown) => void;
  postToScro: (message: unknown) => void;
  subscribeEditor: (handler: Handler) => () => void;
  subscribeScro: (handler: Handler) => () => void;
};

declare global {
  interface Window {
    __SCRO_OPENCUT_HOST__?: ScroOpenCutHost;
  }
}

export function createScroOpenCutHost(): ScroOpenCutHost {
  const toEditor = new Set<Handler>();
  const toScro = new Set<Handler>();
  return {
    postToEditor(message) {
      for (const handler of toEditor) handler(message);
    },
    postToScro(message) {
      for (const handler of toScro) handler(message);
    },
    subscribeEditor(handler) {
      toEditor.add(handler);
      return () => toEditor.delete(handler);
    },
    subscribeScro(handler) {
      toScro.add(handler);
      return () => toScro.delete(handler);
    },
  };
}
