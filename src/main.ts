import { render } from 'lit-html';
import { trainTemplate } from './ui/template';
import { initialViewState } from './ui/view-state';
import './ui/style.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing application container');

render(trainTemplate(initialViewState), app);
