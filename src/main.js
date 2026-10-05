// core(로직)와 ui(화면)를 연결하는 진입점.
import { mountApp } from './ui/app.js';

mountApp(document.getElementById('app'));
