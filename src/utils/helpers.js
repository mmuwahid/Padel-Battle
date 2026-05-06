export function formatTeam(p1,p2){return `${p1} x ${p2}`;}
export function win(sets){let a=0,b=0;sets.forEach(([x,y])=>{if(x>y)a++;else b++;});return a>b?"A":"B";}
export function formatDate(d){const dt=new Date(d);const dd=String(dt.getDate()).padStart(2,"0");const mmm=dt.toLocaleString("en-GB",{month:"short"});const yyyy=dt.getFullYear();return `${dd}/${mmm}/${yyyy}`;}
export function setTotals(sets){return sets.reduce(([a,b],[x,y])=>[a+x,b+y],[0,0]);}

// S050 expansion: ISO-3 country code → ISO-2 (used to derive the flag emoji).
// Covers all UN member states + Palestine + Taiwan + Vatican.
// Israel intentionally excluded per project decision.
// Renders empty string for unknown codes — UI surfaces hide the flag when this returns "".
const ISO3_TO_ISO2={
  AFG:"AF",ALB:"AL",DZA:"DZ",AND:"AD",AGO:"AO",ATG:"AG",ARG:"AR",ARM:"AM",AUS:"AU",AUT:"AT",AZE:"AZ",
  BHS:"BS",BHR:"BH",BGD:"BD",BRB:"BB",BLR:"BY",BEL:"BE",BLZ:"BZ",BEN:"BJ",BTN:"BT",BOL:"BO",BIH:"BA",BWA:"BW",BRA:"BR",BRN:"BN",BGR:"BG",BFA:"BF",BDI:"BI",
  CPV:"CV",KHM:"KH",CMR:"CM",CAN:"CA",CAF:"CF",TCD:"TD",CHL:"CL",CHN:"CN",COL:"CO",COM:"KM",COG:"CG",COD:"CD",CRI:"CR",CIV:"CI",HRV:"HR",CUB:"CU",CYP:"CY",CZE:"CZ",
  DNK:"DK",DJI:"DJ",DMA:"DM",DOM:"DO",
  ECU:"EC",EGY:"EG",SLV:"SV",GNQ:"GQ",ERI:"ER",EST:"EE",SWZ:"SZ",ETH:"ET",
  FJI:"FJ",FIN:"FI",FRA:"FR",
  GAB:"GA",GMB:"GM",GEO:"GE",DEU:"DE",GHA:"GH",GBR:"GB",GRC:"GR",GRD:"GD",GTM:"GT",GIN:"GN",GNB:"GW",GUY:"GY",
  HTI:"HT",HND:"HN",HUN:"HU",
  ISL:"IS",IND:"IN",IDN:"ID",IRN:"IR",IRQ:"IQ",IRL:"IE",ITA:"IT",
  JAM:"JM",JPN:"JP",JOR:"JO",
  KAZ:"KZ",KEN:"KE",KIR:"KI",PRK:"KP",KOR:"KR",KWT:"KW",KGZ:"KG",
  LAO:"LA",LVA:"LV",LBN:"LB",LSO:"LS",LBR:"LR",LBY:"LY",LIE:"LI",LTU:"LT",LUX:"LU",
  MDG:"MG",MWI:"MW",MYS:"MY",MDV:"MV",MLI:"ML",MLT:"MT",MHL:"MH",MRT:"MR",MUS:"MU",MEX:"MX",FSM:"FM",MDA:"MD",MCO:"MC",MNG:"MN",MNE:"ME",MAR:"MA",MOZ:"MZ",MMR:"MM",
  NAM:"NA",NRU:"NR",NPL:"NP",NLD:"NL",NZL:"NZ",NIC:"NI",NER:"NE",NGA:"NG",MKD:"MK",NOR:"NO",
  OMN:"OM",
  PAK:"PK",PLW:"PW",PSE:"PS",PAN:"PA",PNG:"PG",PRY:"PY",PER:"PE",PHL:"PH",POL:"PL",PRT:"PT",
  QAT:"QA",
  ROU:"RO",RUS:"RU",RWA:"RW",
  KNA:"KN",LCA:"LC",VCT:"VC",WSM:"WS",SMR:"SM",STP:"ST",SAU:"SA",SEN:"SN",SRB:"RS",SYC:"SC",SLE:"SL",SGP:"SG",SVK:"SK",SVN:"SI",SLB:"SB",SOM:"SO",ZAF:"ZA",SSD:"SS",ESP:"ES",LKA:"LK",SDN:"SD",SUR:"SR",SWE:"SE",CHE:"CH",SYR:"SY",
  TWN:"TW",TJK:"TJ",TZA:"TZ",THA:"TH",TLS:"TL",TGO:"TG",TON:"TO",TTO:"TT",TUN:"TN",TUR:"TR",TKM:"TM",TUV:"TV",
  UGA:"UG",UKR:"UA",ARE:"AE",USA:"US",URY:"UY",UZB:"UZ",
  VUT:"VU",VAT:"VA",VEN:"VE",VNM:"VN",
  YEM:"YE",
  ZMB:"ZM",ZWE:"ZW",
};
export function flagEmoji(iso3){if(!iso3)return"";const c=ISO3_TO_ISO2[iso3.toUpperCase()];if(!c)return"";return String.fromCodePoint(...c.split("").map(ch=>0x1F1E6+ch.charCodeAt(0)-65));}

// S051 / Issue #20: Decode an image File to a drawable (ImageBitmap or HTMLImageElement).
// Tries `createImageBitmap` first — natively decodes HEIC on iOS 17+ and avoids the
// FileReader->data URL->Image chain that was failing intermittently on first attempt
// in iOS Safari PWA mode. Falls back to URL.createObjectURL + Image for older browsers.
// Both ImageBitmap and HTMLImageElement are valid first args to ctx.drawImage().
export async function decodeImageFile(file){
  if(typeof createImageBitmap==="function"){
    try{return await createImageBitmap(file);}catch(_e){/* fall through */}
  }
  const url=URL.createObjectURL(file);
  const img=new Image();
  try{
    await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error("Failed to load image"));img.src=url;});
    return img;
  }catch(e){
    URL.revokeObjectURL(url);
    throw e;
  }
}
