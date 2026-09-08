import { render } from 'lit-html';
import { loadSimulation } from './data/load-simulation';
import { trainTemplate } from './ui/template';
import './ui/style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing application container');

render(trainTemplate(), app);

loadSimulation('./tracks/kyiv-fastiv.json', './trains/generic.json')
  .then((data) => {
    console.log('Track and train ready', data);
  })
  .catch((error: unknown) => {
    console.error('Failed to load track and train', error);
  });
