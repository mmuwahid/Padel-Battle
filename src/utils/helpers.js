export function formatTeam(p1,p2){return `${p1} x ${p2}`;}
export function win(sets){let a=0,b=0;sets.forEach(([x,y])=>{if(x>y)a++;else b++;});return a>b?"A":"B";}
export function formatDate(d){const dt=new Date(d);const dd=String(dt.getDate()).padStart(2,"0");const mmm=dt.toLocaleString("en-GB",{month:"short"});const yyyy=dt.getFullYear();return `${dd}/${mmm}/${yyyy}`;}
export function setTotals(sets){return sets.reduce(([a,b],[x,y])=>[a+x,b+y],[0,0]);}

// FT-12: ISO-3 country code → flag emoji. Map covers the players in the current league + common picks.
// Renders empty string for unknown codes — top-card flag row hides itself when this returns "".
const ISO3_TO_ISO2={PSE:"PS",IRQ:"IQ",GBR:"GB",LBN:"LB",KWT:"KW",DEU:"DE",USA:"US",CAN:"CA",ESP:"ES",FRA:"FR",ITA:"IT",ARG:"AR",BRA:"BR",MEX:"MX",ARE:"AE",SWE:"SE",AUS:"AU",IND:"IN",JPN:"JP",KOR:"KR",CHN:"CN",RUS:"RU",NLD:"NL",PRT:"PT",CHE:"CH",AUT:"AT",BEL:"BE",DNK:"DK",NOR:"NO",FIN:"FI",IRL:"IE",POL:"PL",TUR:"TR",GRC:"GR",EGY:"EG",SAU:"SA",QAT:"QA",JOR:"JO",SYR:"SY",MAR:"MA",TUN:"TN",DZA:"DZ"};
export function flagEmoji(iso3){if(!iso3)return"";const c=ISO3_TO_ISO2[iso3.toUpperCase()];if(!c)return"";return String.fromCodePoint(...c.split("").map(ch=>0x1F1E6+ch.charCodeAt(0)-65));}
