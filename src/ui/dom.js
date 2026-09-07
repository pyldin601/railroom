/** Avoid repeated DOM text writes while the dashboard is running. */
export function setText(id, text) {
  const element = document.getElementById(id),
    value = String(text);
  if (element.textContent !== value) element.textContent = value;
}
