import { render } from 'lit-html';
import { loadSimulation } from './data/load-simulation';
import { trainTemplate } from './ui/template';
import './ui/style.css';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('Missing application container');

  const { track, train } = await loadSimulation(
    './tracks/kyiv-fastiv.json',
    './trains/generic.json',
  );

  console.log('Track and train ready', { track, train });

  render(trainTemplate(), app);
}

main().catch((error: unknown) => {
  console.error('Failed to start simulation', error);
});
