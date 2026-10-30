import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/ui',timeout:120000,workers:1,use:{channel:'msedge',headless:true,viewport:{width:1440,height:1000},launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}},webServer:{command:'node tests/server.mjs',url:'http://127.0.0.1:8080',reuseExistingServer:true}});
