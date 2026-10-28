const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync('dist/effects.js','utf8');const expression=source.match(/float rootY=([^;]+);/)[1];
const root=new Function('x','sqrt','max','min','return '+expression);
const y=x=>root(x,Math.sqrt,Math.max,Math.min);
test('fire roots follow the upper semicircle instead of a horizontal line',()=>{assert.ok(Math.abs(y(0)-.9)<1e-9);assert.ok(y(.25)>y(0));assert.ok(y(.45)>y(.25));assert.ok(Math.abs(y(.5)-1.4)<1e-9);});
test('left and right flame roots meet the same curved shoulders',()=>{for(const x of [.1,.25,.4,.5])assert.ok(Math.abs(y(-x)-y(x))<1e-9);});
