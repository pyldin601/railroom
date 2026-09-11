export function enableAudioOnFirstInteraction(context: AudioContext): void {
  let resuming = false;

  const enable = (): void => {
    if (resuming) {
      return;
    }

    resuming = true;
    void context.resume().then(
      () => {
        document.removeEventListener('pointerdown', enable, true);
        document.removeEventListener('keydown', enable, true);
      },
      () => {
        resuming = false;
      },
    );
  };

  document.addEventListener('pointerdown', enable, { capture: true });
  document.addEventListener('keydown', enable, { capture: true });
}
