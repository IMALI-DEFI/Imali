'use strict';
// Stable destination identities keep founder credentials separate from product accounts.
const destinations={imali:{label:'IMALI',username:'imali_defi'},sports_jedi:{label:'Sports Jedi',username:'sportsjedi'},founder:{label:'Founder / personal',username:'whoisblackgriff'}};
function expectedUsername(brand,platform){return ['threads','instagram'].includes(platform)?destinations[brand]?.username:null;}
function assertUsername(brand,platform,value){const expected=expectedUsername(brand,platform);if(expected&&String(value||'').trim().replace(/^@/,'').toLowerCase()!==expected)throw Error('DESTINATION_MISMATCH');}
module.exports={destinations,expectedUsername,assertUsername};
