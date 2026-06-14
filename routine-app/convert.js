const fs = require('fs');
const svg2img = require('svg2img');

const svgStr = fs.readFileSync('badge.svg', 'utf8');

svg2img(svgStr, {width: 192, height: 192}, function(error, buffer) {
    if(error) { console.error(error); return; }
    fs.writeFileSync('badge.png', buffer);
    console.log('badge.png created');
});
