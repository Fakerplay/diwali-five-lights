const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync('dist/diya-three.js','utf8');
const rootExpression=source.match(/float root=([^;]+);/)[1];
const root=new Function('p','sqrt','max','min','return '+rootExpression);
const y=x=>root({x},Math.sqrt,Math.max,Math.min);
test('Three.js fire emitter is the curved cap with symmetric shoulders',()=>{assert.ok(Math.abs(y(0)-.805)<1e-9);assert.ok(y(.2)<y(0));assert.ok(y(.4)<y(.2));assert.ok(Math.abs(y(.5)-.305)<1e-9);assert.equal(y(-.4),y(.4));});
test('orthographic camera stays outside the scaled volume',()=>{const cameraZ=Number(source.match(/camera.position.z=(\d+)/)[1]);const depth=Number(source.match(/BoxGeometry\(2.2,3.1,([\d.]+)\)/)[1]);assert.ok(cameraZ>230*depth/2+1,'camera must not sit inside the fire volume');});
