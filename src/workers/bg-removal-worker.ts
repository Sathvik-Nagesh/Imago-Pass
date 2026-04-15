import { removeBackground, Config } from '@imgly/background-removal';

self.onmessage = async (event: MessageEvent) => {
  const { image, config, isAuto } = event.data;

  try {
    const result = await removeBackground(image, {
      ...config,
      progress: (key: string, current: number, total: number) => {
        self.postMessage({
          type: 'progress',
          key,
          current,
          total
        });
      }
    });

    self.postMessage({
      type: 'done',
      result,
      isAuto
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
