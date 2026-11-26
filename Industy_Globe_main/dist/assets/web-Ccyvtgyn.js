import{g as Ut,_ as fe,a as de,E as pe,f as me,L as ge,c as he,l as Te,b as Ee,C as _e,r as mt,v as ve,W as Ie}from"./index-C0MTwdVf.js";import"./index.esm-Cx2j9qJ4.js";var J,gt,$=function(){var e=self.performance&&performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(e&&e.responseStart>0&&e.responseStart<performance.now())return e},Lt=function(e){if(document.readyState==="loading")return"loading";var t=$();if(t){if(e<t.domInteractive)return"loading";if(t.domContentLoadedEventStart===0||e<t.domContentLoadedEventStart)return"dom-interactive";if(t.domComplete===0||e<t.domComplete)return"dom-content-loaded"}return"complete"},be=function(e){var t=e.nodeName;return e.nodeType===1?t.toLowerCase():t.toUpperCase().replace(/^#/,"")},it=function(e,t){var n="";try{for(;e&&e.nodeType!==9;){var r=e,i=r.id?"#"+r.id:be(r)+(r.classList&&r.classList.value&&r.classList.value.trim()&&r.classList.value.trim().length?"."+r.classList.value.trim().replace(/\s+/g,"."):"");if(n.length+i.length>(t||100)-1)return n||i;if(n=n?i+">"+n:i,r.id)break;e=r.parentNode}}catch{}return n},Ft=-1,Ae=function(){return Ft},L=function(e){addEventListener("pageshow",(function(t){t.persisted&&(Ft=t.timeStamp,e(t))}),!0)},at=function(){var e=$();return e&&e.activationStart||0},A=function(e,t){var n=$(),r="navigate";return Ae()>=0?r="back-forward-cache":n&&(document.prerendering||at()>0?r="prerender":document.wasDiscarded?r="restore":n.type&&(r=n.type.replace(/_/g,"-"))),{name:e,value:t===void 0?-1:t,rating:"good",delta:0,entries:[],id:"v4-".concat(Date.now(),"-").concat(Math.floor(8999999999999*Math.random())+1e12),navigationType:r}},C=function(e,t,n){try{if(PerformanceObserver.supportedEntryTypes.includes(e)){var r=new PerformanceObserver((function(i){Promise.resolve().then((function(){t(i.getEntries())}))}));return r.observe(Object.assign({type:e,buffered:!0},n||{})),r}}catch{}},S=function(e,t,n,r){var i,s;return function(o){t.value>=0&&(o||r)&&((s=t.value-(i||0))||i===void 0)&&(i=t.value,t.delta=s,t.rating=(function(a,c){return a>c[1]?"poor":a>c[0]?"needs-improvement":"good"})(t.value,n),e(t))}},ot=function(e){requestAnimationFrame((function(){return requestAnimationFrame((function(){return e()}))}))},q=function(e){document.addEventListener("visibilitychange",(function(){document.visibilityState==="hidden"&&e()}))},st=function(e){var t=!1;return function(){t||(e(),t=!0)}},R=-1,ht=function(){return document.visibilityState!=="hidden"||document.prerendering?1/0:0},V=function(e){document.visibilityState==="hidden"&&R>-1&&(R=e.type==="visibilitychange"?e.timeStamp:0,Se())},Tt=function(){addEventListener("visibilitychange",V,!0),addEventListener("prerenderingchange",V,!0)},Se=function(){removeEventListener("visibilitychange",V,!0),removeEventListener("prerenderingchange",V,!0)},kt=function(){return R<0&&(R=ht(),Tt(),L((function(){setTimeout((function(){R=ht(),Tt()}),0)}))),{get firstHiddenTime(){return R}}},ct=function(e){document.prerendering?addEventListener("prerenderingchange",(function(){return e()}),!0):e()},Et=[1800,3e3],ye=function(e,t){t=t||{},ct((function(){var n,r=kt(),i=A("FCP"),s=C("paint",(function(o){o.forEach((function(a){a.name==="first-contentful-paint"&&(s.disconnect(),a.startTime<r.firstHiddenTime&&(i.value=Math.max(a.startTime-at(),0),i.entries.push(a),n(!0)))}))}));s&&(n=S(e,i,Et,t.reportAllChanges),L((function(o){i=A("FCP"),n=S(e,i,Et,t.reportAllChanges),ot((function(){i.value=performance.now()-o.timeStamp,n(!0)}))})))}))},_t=[.1,.25],Re=function(e,t){(function(n,r){r=r||{},ye(st((function(){var i,s=A("CLS",0),o=0,a=[],c=function(f){f.forEach((function(l){if(!l.hadRecentInput){var h=a[0],v=a[a.length-1];o&&l.startTime-v.startTime<1e3&&l.startTime-h.startTime<5e3?(o+=l.value,a.push(l)):(o=l.value,a=[l])}})),o>s.value&&(s.value=o,s.entries=a,i())},u=C("layout-shift",c);u&&(i=S(n,s,_t,r.reportAllChanges),q((function(){c(u.takeRecords()),i(!0)})),L((function(){o=0,s=A("CLS",0),i=S(n,s,_t,r.reportAllChanges),ot((function(){return i()}))})),setTimeout(i,0))})))})((function(n){var r=(function(i){var s,o={};if(i.entries.length){var a=i.entries.reduce((function(u,f){return u&&u.value>f.value?u:f}));if(a&&a.sources&&a.sources.length){var c=(s=a.sources).find((function(u){return u.node&&u.node.nodeType===1}))||s[0];c&&(o={largestShiftTarget:it(c.node),largestShiftTime:a.startTime,largestShiftValue:a.value,largestShiftSource:c,largestShiftEntry:a,loadState:Lt(a.startTime)})}}return Object.assign(i,{attribution:o})})(n);e(r)}),t)},Dt=0,j=1/0,k=0,Ne=function(e){e.forEach((function(t){t.interactionId&&(j=Math.min(j,t.interactionId),k=Math.max(k,t.interactionId),Dt=k?(k-j)/7+1:0)}))},Bt=function(){return J?Dt:performance.interactionCount||0},Me=function(){"interactionCount"in performance||J||(J=C("event",Ne,{type:"event",buffered:!0,durationThreshold:0}))},E=[],w=new Map,xt=0,Oe=function(){var e=Math.min(E.length-1,Math.floor((Bt()-xt)/50));return E[e]},zt=[],Ce=function(e){if(zt.forEach((function(i){return i(e)})),e.interactionId||e.entryType==="first-input"){var t=E[E.length-1],n=w.get(e.interactionId);if(n||E.length<10||e.duration>t.latency){if(n)e.duration>n.latency?(n.entries=[e],n.latency=e.duration):e.duration===n.latency&&e.startTime===n.entries[0].startTime&&n.entries.push(e);else{var r={id:e.interactionId,latency:e.duration,entries:[e]};w.set(r.id,r),E.push(r)}E.sort((function(i,s){return s.latency-i.latency})),E.length>10&&E.splice(10).forEach((function(i){return w.delete(i.id)}))}}},ut=function(e){var t=self.requestIdleCallback||self.setTimeout,n=-1;return e=st(e),document.visibilityState==="hidden"?e():(n=t(e),q(e)),n},vt=[200,500],we=function(e,t){"PerformanceEventTiming"in self&&"interactionId"in PerformanceEventTiming.prototype&&(t=t||{},ct((function(){var n;Me();var r,i=A("INP"),s=function(a){ut((function(){a.forEach(Ce);var c=Oe();c&&c.latency!==i.value&&(i.value=c.latency,i.entries=c.entries,r())}))},o=C("event",s,{durationThreshold:(n=t.durationThreshold)!==null&&n!==void 0?n:40});r=S(e,i,vt,t.reportAllChanges),o&&(o.observe({type:"first-input",buffered:!0}),q((function(){s(o.takeRecords()),r(!0)})),L((function(){xt=Bt(),E.length=0,w.clear(),i=A("INP"),r=S(e,i,vt,t.reportAllChanges)})))})))},N=[],b=[],Q=0,lt=new WeakMap,M=new Map,Z=-1,Pe=function(e){N=N.concat(e),Vt()},Vt=function(){Z<0&&(Z=ut(Ue))},Ue=function(){M.size>10&&M.forEach((function(o,a){w.has(a)||M.delete(a)}));var e=E.map((function(o){return lt.get(o.entries[0])})),t=b.length-50;b=b.filter((function(o,a){return a>=t||e.includes(o)}));for(var n=new Set,r=0;r<b.length;r++){var i=b[r];$t(i.startTime,i.processingEnd).forEach((function(o){n.add(o)}))}var s=N.length-1-50;N=N.filter((function(o,a){return o.startTime>Q&&a>s||n.has(o)})),Z=-1};zt.push((function(e){e.interactionId&&e.target&&!M.has(e.interactionId)&&M.set(e.interactionId,e.target)}),(function(e){var t,n=e.startTime+e.duration;Q=Math.max(Q,e.processingEnd);for(var r=b.length-1;r>=0;r--){var i=b[r];if(Math.abs(n-i.renderTime)<=8){(t=i).startTime=Math.min(e.startTime,t.startTime),t.processingStart=Math.min(e.processingStart,t.processingStart),t.processingEnd=Math.max(e.processingEnd,t.processingEnd),t.entries.push(e);break}}t||(t={startTime:e.startTime,processingStart:e.processingStart,processingEnd:e.processingEnd,renderTime:n,entries:[e]},b.push(t)),(e.interactionId||e.entryType==="first-input")&&lt.set(e,t),Vt()}));var $t=function(e,t){for(var n,r=[],i=0;n=N[i];i++)if(!(n.startTime+n.duration<e)){if(n.startTime>t)break;r.push(n)}return r},Le=function(e,t){gt||(gt=C("long-animation-frame",Pe)),we((function(n){var r=(function(i){var s=i.entries[0],o=lt.get(s),a=s.processingStart,c=o.processingEnd,u=o.entries.sort((function(y,le){return y.processingStart-le.processingStart})),f=$t(s.startTime,c),l=i.entries.find((function(y){return y.target})),h=l&&l.target||M.get(s.interactionId),v=[s.startTime+s.duration,c].concat(f.map((function(y){return y.startTime+y.duration}))),F=Math.max.apply(Math,v),ue={interactionTarget:it(h),interactionTargetElement:h,interactionType:s.name.startsWith("key")?"keyboard":"pointer",interactionTime:s.startTime,nextPaintTime:F,processedEventEntries:u,longAnimationFrameEntries:f,inputDelay:a-s.startTime,processingDuration:c-a,presentationDelay:Math.max(F-c,0),loadState:Lt(s.startTime)};return Object.assign(i,{attribution:ue})})(n);e(r)}),t)},It=[2500,4e3],G={},Fe=function(e,t){(function(n,r){r=r||{},ct((function(){var i,s=kt(),o=A("LCP"),a=function(f){r.reportAllChanges||(f=f.slice(-1)),f.forEach((function(l){l.startTime<s.firstHiddenTime&&(o.value=Math.max(l.startTime-at(),0),o.entries=[l],i())}))},c=C("largest-contentful-paint",a);if(c){i=S(n,o,It,r.reportAllChanges);var u=st((function(){G[o.id]||(a(c.takeRecords()),c.disconnect(),G[o.id]=!0,i(!0))}));["keydown","click"].forEach((function(f){addEventListener(f,(function(){return ut(u)}),{once:!0,capture:!0})})),q(u),L((function(f){o=A("LCP"),i=S(n,o,It,r.reportAllChanges),ot((function(){o.value=performance.now()-f.timeStamp,G[o.id]=!0,i(!0)}))}))}}))})((function(n){var r=(function(i){var s={timeToFirstByte:0,resourceLoadDelay:0,resourceLoadDuration:0,elementRenderDelay:i.value};if(i.entries.length){var o=$();if(o){var a=o.activationStart||0,c=i.entries[i.entries.length-1],u=c.url&&performance.getEntriesByType("resource").filter((function(F){return F.name===c.url}))[0],f=Math.max(0,o.responseStart-a),l=Math.max(f,u?(u.requestStart||u.startTime)-a:0),h=Math.max(l,u?u.responseEnd-a:0),v=Math.max(h,c.startTime-a);s={element:it(c.element),timeToFirstByte:f,resourceLoadDelay:l-f,resourceLoadDuration:h-l,elementRenderDelay:v-h,navigationEntry:o,lcpEntry:c},c.url&&(s.url=c.url),u&&(s.lcpResourceEntry=u)}}return Object.assign(i,{attribution:s})})(n);e(r)}),t)};const bt="@firebase/performance",tt="0.7.12";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qt=tt,ke="FB-PERF-TRACE-START",De="FB-PERF-TRACE-STOP",et="FB-PERF-TRACE-MEASURE",jt="_wt_",Gt="_fp",Kt="_fcp",Xt="_fid",Ht="_lcp",Be="lcp_element",Wt="_inp",xe="inp_interactionTarget",Yt="_cls",ze="cls_largestShiftTarget",Jt="@firebase/performance/config",Qt="@firebase/performance/configexpire",Ve="performance",Zt="Performance";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const $e={"trace started":"Trace {$traceName} was started before.","trace stopped":"Trace {$traceName} is not running.","nonpositive trace startTime":"Trace {$traceName} startTime should be positive.","nonpositive trace duration":"Trace {$traceName} duration should be positive.","no window":"Window is not available.","no app id":"App id is not available.","no project id":"Project id is not available.","no api key":"Api key is not available.","invalid cc log":"Attempted to queue invalid cc event","FB not default":"Performance can only start when Firebase app instance is the default one.","RC response not ok":"RC response is not ok","invalid attribute name":"Attribute name {$attributeName} is invalid.","invalid attribute value":"Attribute value {$attributeValue} is invalid.","invalid custom metric name":"Custom metric name {$customMetricName} is invalid","invalid String merger input":"Input for String merger is invalid, contact support team to resolve.","already initialized":"initializePerformance() has already been called with different options. To avoid this error, call initializePerformance() with the same options as when it was originally called, or call getPerformance() to return the already initialized instance."},p=new pe(Ve,Zt,$e);/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const I=new ge(Zt);I.logLevel=Te.INFO;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let K,te;class d{constructor(t){if(this.window=t,!t)throw p.create("no window");this.performance=t.performance,this.PerformanceObserver=t.PerformanceObserver,this.windowLocation=t.location,this.navigator=t.navigator,this.document=t.document,this.navigator&&this.navigator.cookieEnabled&&(this.localStorage=t.localStorage),t.perfMetrics&&t.perfMetrics.onFirstInputDelay&&(this.onFirstInputDelay=t.perfMetrics.onFirstInputDelay),this.onLCP=Fe,this.onINP=Le,this.onCLS=Re}getUrl(){return this.windowLocation.href.split("?")[0]}mark(t){!this.performance||!this.performance.mark||this.performance.mark(t)}measure(t,n,r){!this.performance||!this.performance.measure||this.performance.measure(t,n,r)}getEntriesByType(t){return!this.performance||!this.performance.getEntriesByType?[]:this.performance.getEntriesByType(t)}getEntriesByName(t){return!this.performance||!this.performance.getEntriesByName?[]:this.performance.getEntriesByName(t)}getTimeOrigin(){return this.performance&&(this.performance.timeOrigin||this.performance.timing.navigationStart)}requiredApisAvailable(){return!fetch||!Promise||!me()?(I.info("Firebase Performance cannot start if browser does not support fetch and Promise or cookie is disabled."),!1):he()?!0:(I.info("IndexedDB is not supported by current browser"),!1)}setupObserver(t,n){if(!this.PerformanceObserver)return;new this.PerformanceObserver(i=>{for(const s of i.getEntries())n(s)}).observe({entryTypes:[t]})}static getInstance(){return K===void 0&&(K=new d(te)),K}}function qe(e){te=e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ee;function je(e){const t=e.getId();return t.then(n=>{ee=n}),t}function ft(){return ee}function Ge(e){const t=e.getToken();return t.then(n=>{}),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function At(e,t){const n=e.length-t.length;if(n<0||n>1)throw p.create("invalid String merger input");const r=[];for(let i=0;i<e.length;i++)r.push(e.charAt(i)),t.length>i&&r.push(t.charAt(i));return r.join("")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let X;class m{constructor(){this.instrumentationEnabled=!0,this.dataCollectionEnabled=!0,this.loggingEnabled=!1,this.tracesSamplingRate=1,this.networkRequestsSamplingRate=1,this.logEndPointUrl="https://firebaselogging.googleapis.com/v0cc/log?format=json_proto",this.flTransportEndpointUrl=At("hts/frbslgigp.ogepscmv/ieo/eaylg","tp:/ieaeogn-agolai.o/1frlglgc/o"),this.transportKey=At("AzSC8r6ReiGqFMyfvgow","Iayx0u-XT3vksVM-pIV"),this.logSource=462,this.logTraceAfterSampling=!1,this.logNetworkAfterSampling=!1,this.configTimeToLive=12,this.logMaxFlushSize=40}getFlTransportFullUrl(){return this.flTransportEndpointUrl.concat("?key=",this.transportKey)}static getInstance(){return X===void 0&&(X=new m),X}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var P;(function(e){e[e.UNKNOWN=0]="UNKNOWN",e[e.VISIBLE=1]="VISIBLE",e[e.HIDDEN=2]="HIDDEN"})(P||(P={}));const Ke=["firebase_","google_","ga_"],Xe=new RegExp("^[a-zA-Z]\\w*$"),He=40,nt=100;function We(){const e=d.getInstance().navigator;return e!=null&&e.serviceWorker?e.serviceWorker.controller?2:3:1}function Ye(){switch(d.getInstance().document.visibilityState){case"visible":return P.VISIBLE;case"hidden":return P.HIDDEN;default:return P.UNKNOWN}}function Je(){const t=d.getInstance().navigator.connection;switch(t&&t.effectiveType){case"slow-2g":return 1;case"2g":return 2;case"3g":return 3;case"4g":return 4;default:return 0}}function Qe(e){return e.length===0||e.length>He?!1:!Ke.some(n=>e.startsWith(n))&&!!e.match(Xe)}function Ze(e){return e.length!==0&&e.length<=nt}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ne(e){var n;const t=(n=e.options)==null?void 0:n.appId;if(!t)throw p.create("no app id");return t}function tn(e){var n;const t=(n=e.options)==null?void 0:n.projectId;if(!t)throw p.create("no project id");return t}function en(e){var n;const t=(n=e.options)==null?void 0:n.apiKey;if(!t)throw p.create("no api key");return t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const nn="0.0.1",g={loggingEnabled:!0},rn="FIREBASE_INSTALLATIONS_AUTH";function an(e,t){const n=on();return n?(St(n),Promise.resolve()):un(e,t).then(St).then(r=>sn(r),()=>{})}function on(){const e=d.getInstance().localStorage;if(!e)return;const t=e.getItem(Qt);if(!t||!ln(t))return;const n=e.getItem(Jt);if(n)try{return JSON.parse(n)}catch{return}}function sn(e){const t=d.getInstance().localStorage;!e||!t||(t.setItem(Jt,JSON.stringify(e)),t.setItem(Qt,String(Date.now()+m.getInstance().configTimeToLive*60*60*1e3)))}const cn="Could not fetch config, will use default configs";function un(e,t){return Ge(e.installations).then(n=>{const r=tn(e.app),i=en(e.app),s=`https://firebaseremoteconfig.googleapis.com/v1/projects/${r}/namespaces/fireperf:fetch?key=${i}`,o=new Request(s,{method:"POST",headers:{Authorization:`${rn} ${n}`},body:JSON.stringify({app_instance_id:t,app_instance_id_token:n,app_id:ne(e.app),app_version:qt,sdk_version:nn})});return fetch(o).then(a=>{if(a.ok)return a.json();throw p.create("RC response not ok")})}).catch(()=>{I.info(cn)})}function St(e){if(!e)return e;const t=m.getInstance(),n=e.entries||{};return n.fpr_enabled!==void 0?t.loggingEnabled=String(n.fpr_enabled)==="true":t.loggingEnabled=g.loggingEnabled,n.fpr_log_source?t.logSource=Number(n.fpr_log_source):g.logSource&&(t.logSource=g.logSource),n.fpr_log_endpoint_url?t.logEndPointUrl=n.fpr_log_endpoint_url:g.logEndPointUrl&&(t.logEndPointUrl=g.logEndPointUrl),n.fpr_log_transport_key?t.transportKey=n.fpr_log_transport_key:g.transportKey&&(t.transportKey=g.transportKey),n.fpr_vc_network_request_sampling_rate!==void 0?t.networkRequestsSamplingRate=Number(n.fpr_vc_network_request_sampling_rate):g.networkRequestsSamplingRate!==void 0&&(t.networkRequestsSamplingRate=g.networkRequestsSamplingRate),n.fpr_vc_trace_sampling_rate!==void 0?t.tracesSamplingRate=Number(n.fpr_vc_trace_sampling_rate):g.tracesSamplingRate!==void 0&&(t.tracesSamplingRate=g.tracesSamplingRate),n.fpr_log_max_flush_size?t.logMaxFlushSize=Number(n.fpr_log_max_flush_size):g.logMaxFlushSize&&(t.logMaxFlushSize=g.logMaxFlushSize),t.logTraceAfterSampling=yt(t.tracesSamplingRate),t.logNetworkAfterSampling=yt(t.networkRequestsSamplingRate),e}function ln(e){return Number(e)>Date.now()}function yt(e){return Math.random()<=e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let dt=1,H;function re(e){return dt=2,H=H||dn(e),H}function fn(){return dt===3}function dn(e){return pn().then(()=>je(e.installations)).then(t=>an(e,t)).then(()=>Rt(),()=>Rt())}function pn(){const e=d.getInstance().document;return new Promise(t=>{if(e&&e.readyState!=="complete"){const n=()=>{e.readyState==="complete"&&(e.removeEventListener("readystatechange",n),t())};e.addEventListener("readystatechange",n)}else t()})}function Rt(){dt=3}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ie=10*1e3,mn=5.5*1e3,gn=1e3,ae=3,hn=65536,Tn=new TextEncoder;let x=ae,T=[],Nt=!1;function En(){Nt||(pt(mn),Nt=!0)}function pt(e){setTimeout(()=>{x<=0||(T.length>0&&_n(),pt(ie))},e)}function _n(){const e=T.splice(0,gn),t=rt(e);vn(t).then(()=>{x=ae}).catch(()=>{T=[...e,...T],x--,I.info(`Tries left: ${x}.`),pt(ie)})}function rt(e){const t=e.map(r=>({source_extension_json_proto3:r.message,event_time_ms:String(r.eventTime)})),n={request_time_ms:String(Date.now()),client_info:{client_type:1,js_client_info:{}},log_source:m.getInstance().logSource,log_event:t};return JSON.stringify(n)}function vn(e){const t=m.getInstance().getFlTransportFullUrl();return Tn.encode(e).length<=hn&&navigator.sendBeacon&&navigator.sendBeacon(t,e)?Promise.resolve():fetch(t,{method:"POST",body:e})}function In(e){if(!e.eventTime||!e.message)throw p.create("invalid cc log");T=[...T,e]}function bn(e){return(...t)=>{const n=e(...t);In({message:n,eventTime:Date.now()})}}function An(){const e=m.getInstance().getFlTransportFullUrl();for(;T.length>0;){const t=T.splice(-m.getInstance().logMaxFlushSize),n=rt(t);if(!(navigator.sendBeacon&&navigator.sendBeacon(e,n))){T=[...T,...t];break}}if(T.length>0){const t=rt(T);fetch(e,{method:"POST",body:t}).catch(()=>{I.info("Failed flushing queued events.")})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let U;function oe(e,t){U||(U={send:bn(Rn),flush:An}),U.send(e,t)}function D(e){const t=m.getInstance();!t.instrumentationEnabled&&e.isAuto||!t.dataCollectionEnabled&&!e.isAuto||d.getInstance().requiredApisAvailable()&&(fn()?W(e):re(e.performanceController).then(()=>W(e),()=>W(e)))}function Sn(){U&&U.flush()}function W(e){if(!ft())return;const t=m.getInstance();!t.loggingEnabled||!t.logTraceAfterSampling||oe(e,1)}function yn(e){const t=m.getInstance();if(!t.instrumentationEnabled)return;const n=e.url,r=t.logEndPointUrl.split("?")[0],i=t.flTransportEndpointUrl.split("?")[0];n===r||n===i||!t.loggingEnabled||!t.logNetworkAfterSampling||oe(e,0)}function Rn(e,t){return t===0?Nn(e):Mn(e)}function Nn(e){const t={url:e.url,http_method:e.httpMethod||0,http_response_code:200,response_payload_bytes:e.responsePayloadBytes,client_start_time_us:e.startTimeUs,time_to_response_initiated_us:e.timeToResponseInitiatedUs,time_to_response_completed_us:e.timeToResponseCompletedUs},n={application_info:se(e.performanceController.app),network_request_metric:t};return JSON.stringify(n)}function Mn(e){const t={name:e.name,is_auto:e.isAuto,client_start_time_us:e.startTimeUs,duration_us:e.durationUs};Object.keys(e.counters).length!==0&&(t.counters=e.counters);const n=e.getAttributes();Object.keys(n).length!==0&&(t.custom_attributes=n);const r={application_info:se(e.performanceController.app),trace_metric:t};return JSON.stringify(r)}function se(e){return{google_app_id:ne(e),app_instance_id:ft(),web_app_info:{sdk_version:qt,page_url:d.getInstance().getUrl(),service_worker_status:We(),visibility_state:Ye(),effective_connection_type:Je()},application_process_state:0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Mt(e,t){const n=t;if(!n||n.responseStart===void 0)return;const r=d.getInstance().getTimeOrigin(),i=Math.floor((n.startTime+r)*1e3),s=n.responseStart?Math.floor((n.responseStart-n.startTime)*1e3):void 0,o=Math.floor((n.responseEnd-n.startTime)*1e3),a=n.name&&n.name.split("?")[0],c={performanceController:e,url:a,responsePayloadBytes:n.transferSize,startTimeUs:i,timeToResponseInitiatedUs:s,timeToResponseCompletedUs:o};yn(c)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const On=100,Cn="_",wn=[Gt,Kt,Xt,Ht,Yt,Wt];function Pn(e,t){return e.length===0||e.length>On?!1:t&&t.startsWith(jt)&&wn.indexOf(e)>-1||!e.startsWith(Cn)}function Un(e){const t=Math.floor(e);return t<e&&I.info(`Metric value should be an Integer, setting the value as : ${t}.`),t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O{constructor(t,n,r=!1,i){this.performanceController=t,this.name=n,this.isAuto=r,this.state=1,this.customAttributes={},this.counters={},this.api=d.getInstance(),this.randomId=Math.floor(Math.random()*1e6),this.isAuto||(this.traceStartMark=`${ke}-${this.randomId}-${this.name}`,this.traceStopMark=`${De}-${this.randomId}-${this.name}`,this.traceMeasure=i||`${et}-${this.randomId}-${this.name}`,i&&this.calculateTraceMetrics())}start(){if(this.state!==1)throw p.create("trace started",{traceName:this.name});this.api.mark(this.traceStartMark),this.state=2}stop(){if(this.state!==2)throw p.create("trace stopped",{traceName:this.name});this.state=3,this.api.mark(this.traceStopMark),this.api.measure(this.traceMeasure,this.traceStartMark,this.traceStopMark),this.calculateTraceMetrics(),D(this)}record(t,n,r){if(t<=0)throw p.create("nonpositive trace startTime",{traceName:this.name});if(n<=0)throw p.create("nonpositive trace duration",{traceName:this.name});if(this.durationUs=Math.floor(n*1e3),this.startTimeUs=Math.floor(t*1e3),r&&r.attributes&&(this.customAttributes={...r.attributes}),r&&r.metrics)for(const i of Object.keys(r.metrics))isNaN(Number(r.metrics[i]))||(this.counters[i]=Math.floor(Number(r.metrics[i])));D(this)}incrementMetric(t,n=1){this.counters[t]===void 0?this.putMetric(t,n):this.putMetric(t,this.counters[t]+n)}putMetric(t,n){if(Pn(t,this.name))this.counters[t]=Un(n??0);else throw p.create("invalid custom metric name",{customMetricName:t})}getMetric(t){return this.counters[t]||0}putAttribute(t,n){const r=Qe(t),i=Ze(n);if(r&&i){this.customAttributes[t]=n;return}if(!r)throw p.create("invalid attribute name",{attributeName:t});if(!i)throw p.create("invalid attribute value",{attributeValue:n})}getAttribute(t){return this.customAttributes[t]}removeAttribute(t){this.customAttributes[t]!==void 0&&delete this.customAttributes[t]}getAttributes(){return{...this.customAttributes}}setStartTime(t){this.startTimeUs=t}setDuration(t){this.durationUs=t}calculateTraceMetrics(){const t=this.api.getEntriesByName(this.traceMeasure),n=t&&t[0];n&&(this.durationUs=Math.floor(n.duration*1e3),this.startTimeUs=Math.floor((n.startTime+this.api.getTimeOrigin())*1e3))}static createOobTrace(t,n,r,i,s){const o=d.getInstance().getUrl();if(!o)return;const a=new O(t,jt+o,!0),c=Math.floor(d.getInstance().getTimeOrigin()*1e3);a.setStartTime(c),n&&n[0]&&(a.setDuration(Math.floor(n[0].duration*1e3)),a.putMetric("domInteractive",Math.floor(n[0].domInteractive*1e3)),a.putMetric("domContentLoadedEventEnd",Math.floor(n[0].domContentLoadedEventEnd*1e3)),a.putMetric("loadEventEnd",Math.floor(n[0].loadEventEnd*1e3)));const u="first-paint",f="first-contentful-paint";if(r){const l=r.find(v=>v.name===u);l&&l.startTime&&a.putMetric(Gt,Math.floor(l.startTime*1e3));const h=r.find(v=>v.name===f);h&&h.startTime&&a.putMetric(Kt,Math.floor(h.startTime*1e3)),s&&a.putMetric(Xt,Math.floor(s*1e3))}this.addWebVitalMetric(a,Ht,Be,i.lcp),this.addWebVitalMetric(a,Yt,ze,i.cls),this.addWebVitalMetric(a,Wt,xe,i.inp),D(a),Sn()}static addWebVitalMetric(t,n,r,i){i&&(t.putMetric(n,Math.floor(i.value*1e3)),i.elementAttribution&&(i.elementAttribution.length>nt?t.putAttribute(r,i.elementAttribution.substring(0,nt)):t.putAttribute(r,i.elementAttribution)))}static createUserTimingTrace(t,n){const r=new O(t,n,!1,n);D(r)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let z={},Ot=!1,ce;function Ct(e){ft()&&(setTimeout(()=>Fn(e),0),setTimeout(()=>Ln(e),0),setTimeout(()=>kn(e),0))}function Ln(e){const t=d.getInstance(),n=t.getEntriesByType("resource");for(const r of n)Mt(e,r);t.setupObserver("resource",r=>Mt(e,r))}function Fn(e){const t=d.getInstance();"onpagehide"in window?t.document.addEventListener("pagehide",()=>Y(e)):t.document.addEventListener("unload",()=>Y(e)),t.document.addEventListener("visibilitychange",()=>{t.document.visibilityState==="hidden"&&Y(e)}),t.onFirstInputDelay&&t.onFirstInputDelay(n=>{ce=n}),t.onLCP(n=>{var r;z.lcp={value:n.value,elementAttribution:(r=n.attribution)==null?void 0:r.element}}),t.onCLS(n=>{var r;z.cls={value:n.value,elementAttribution:(r=n.attribution)==null?void 0:r.largestShiftTarget}}),t.onINP(n=>{var r;z.inp={value:n.value,elementAttribution:(r=n.attribution)==null?void 0:r.interactionTarget}})}function kn(e){const t=d.getInstance(),n=t.getEntriesByType("measure");for(const r of n)wt(e,r);t.setupObserver("measure",r=>wt(e,r))}function wt(e,t){const n=t.name;n.substring(0,et.length)!==et&&O.createUserTimingTrace(e,n)}function Y(e){if(!Ot){Ot=!0;const t=d.getInstance(),n=t.getEntriesByType("navigation"),r=t.getEntriesByType("paint");setTimeout(()=>{O.createOobTrace(e,n,r,z,ce)},0)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dn{constructor(t,n){this.app=t,this.installations=n,this.initialized=!1}_init(t){this.initialized||((t==null?void 0:t.dataCollectionEnabled)!==void 0&&(this.dataCollectionEnabled=t.dataCollectionEnabled),(t==null?void 0:t.instrumentationEnabled)!==void 0&&(this.instrumentationEnabled=t.instrumentationEnabled),d.getInstance().requiredApisAvailable()?ve().then(n=>{n&&(En(),re(this).then(()=>Ct(this),()=>Ct(this)),this.initialized=!0)}).catch(n=>{I.info(`Environment doesn't support IndexedDB: ${n}`)}):I.info('Firebase Performance cannot start if the browser does not support "Fetch" and "Promise", or cookies are disabled.'))}set instrumentationEnabled(t){m.getInstance().instrumentationEnabled=t}get instrumentationEnabled(){return m.getInstance().instrumentationEnabled}set dataCollectionEnabled(t){m.getInstance().dataCollectionEnabled=t}get dataCollectionEnabled(){return m.getInstance().dataCollectionEnabled}}const Bn="[DEFAULT]";function B(e=de()){return e=Ut(e),fe(e,"performance").getImmediate()}function Pt(e,t){return e=Ut(e),new O(e,t)}const xn=(e,{options:t})=>{const n=e.getProvider("app").getImmediate(),r=e.getProvider("installations-internal").getImmediate();if(n.name!==Bn)throw p.create("FB not default");if(typeof window>"u")throw p.create("no window");qe(window);const i=new Dn(n,r);return i._init(t),i};function zn(){Ee(new _e("performance",xn,"PUBLIC")),mt(bt,tt),mt(bt,tt,"esm2020")}zn();class _ extends Ie{constructor(){super(...arguments),this.traces={}}async startTrace(t){const n=B(),r=Pt(n,t.traceName);r.start(),this.traces[t.traceName]=r}async stopTrace(t){const n=this.traces[t.traceName];if(!n)throw new Error(_.ERROR_TRACE_NOT_FOUND);n.stop(),delete this.traces[t.traceName]}async incrementMetric(t){const n=this.traces[t.traceName];if(!n)throw new Error(_.ERROR_TRACE_NOT_FOUND);n.incrementMetric(t.metricName,t.incrementBy)}async setEnabled(t){const n=B();n.instrumentationEnabled=t.enabled,n.dataCollectionEnabled=t.enabled}async isEnabled(){const t=B();return{enabled:t.instrumentationEnabled||t.dataCollectionEnabled}}async putAttribute({traceName:t,attribute:n,value:r}){const i=this.traces[t];if(!i)throw new Error(_.ERROR_TRACE_NOT_FOUND);i.putAttribute(n,r)}async getAttribute({traceName:t,attribute:n}){var r;const i=this.traces[t];if(!i)throw new Error(_.ERROR_TRACE_NOT_FOUND);return{value:(r=i.getAttribute(n))!==null&&r!==void 0?r:null}}async getAttributes({traceName:t}){const n=this.traces[t];if(!n)throw new Error(_.ERROR_TRACE_NOT_FOUND);return{attributes:n.getAttributes()}}async removeAttribute({traceName:t,attribute:n}){const r=this.traces[t];if(!r)throw new Error(_.ERROR_TRACE_NOT_FOUND);r.removeAttribute(n)}async putMetric({traceName:t,metricName:n,num:r}){const i=this.traces[t];if(!i)throw new Error(_.ERROR_TRACE_NOT_FOUND);i.putMetric(n,r)}async getMetric({traceName:t,metricName:n}){const r=this.traces[t];if(!r)throw new Error(_.ERROR_TRACE_NOT_FOUND);return{value:r.getMetric(n)}}async record({traceName:t,startTime:n,duration:r,options:i}){const s=B();Pt(s,t).record(n,r,i)}}_.ERROR_TRACE_NOT_FOUND="No trace was found with the provided traceName.";export{_ as FirebasePerformanceWeb};
