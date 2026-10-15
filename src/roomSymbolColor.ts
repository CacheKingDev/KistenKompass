export function roomSymbolColor(color:string){
 const rgb=/^#[0-9a-f]{6}$/i.test(color)?color.slice(1):'dddddd';
 const channels=[0,2,4].map(offset=>{const value=parseInt(rgb.slice(offset,offset+2),16)/255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;});
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722>.179?'#000':'#fff';
}
