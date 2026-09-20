import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";



const HISTORY_FILE =
"./output/topic-history.json";



const CATEGORIES = {


technology:[

"WiFi",
"Bluetooth",
"GPS",
"QR Codes",
"Smartphones",
"Artificial Intelligence",
"Internet",
"Microchips",
"Robots",
"Electric Cars",
"Satellites",
"Virtual Reality",
"3D Printing",
"Computer History",
"Battery Technology"

],


science:[

"Black Holes",
"Quantum Physics",
"DNA",
"Human Brain",
"Gravity",
"Lightning",
"Volcanoes",
"Deep Ocean",
"Evolution",
"Time",
"Energy"

],


history:[

"Ancient Machines",
"Forgotten Inventions",
"First Computers",
"First Airplanes",
"Old Engineering",
"Lost Technologies",
"Famous Discoveries"

],



engineering:[

"Bridges",
"Skyscrapers",
"Power Plants",
"Aircraft Engines",
"Electric Motors",
"Factories",
"Construction Machines"

],



daily:[

"Keyboard",
"Barcode",
"Camera",
"LED Lights",
"Microwave",
"Elevator",
"Printer",
"Refrigerator"

]


};





const FORMATS=[

"The hidden story behind {x}",

"How {x} changed the world",

"Why was {x} invented?",

"The surprising truth about {x}",

"How does {x} actually work?",

"The technology secret of {x}",

"Nobody explains {x} like this",

"The forgotten history of {x}"

];




const ANGLES=[

"origin story",

"how it works",

"hidden technology",

"history",

"future impact",

"engineering",

"unknown facts"

];




function random<T>(arr:T[]):T{

return arr[
Math.floor(
Math.random()*arr.length
)
];

}





async function loadHistory():Promise<string[]>{

if(!existsSync(HISTORY_FILE))
return [];


return JSON.parse(
await readFile(
HISTORY_FILE,
"utf8"
)
);


}







async function saveHistory(
data:string[]
){

await writeFile(
HISTORY_FILE,
JSON.stringify(
data,
null,
2
)
);

}








export async function generateUniqueTopic(){



const history =
await loadHistory();



let result;



let tries=0;



while(tries<100){


const category =
random(
Object.keys(CATEGORIES)
);



const subject =
random(
(CATEGORIES as any)[category]
);



const format =
random(FORMATS);



const angle =
random(ANGLES);



result =
format.replace(
"{x}",
subject
);



const id =
`${result}-${angle}`;



if(
!history.includes(id)
){

history.push(id);

await saveHistory(
history
);


return {


topic:result,


baseTopic:subject,


category,


angle,


searchQueries:[

subject,

category,

"technology documentary",

"cinematic documentary"

]

};


}


tries++;


}




throw new Error(
"No unique topics available"
);


}








export async function generateBatch(
count:number
){


const topics=[];


for(
let i=0;
i<count;
i++
){

topics.push(
await generateUniqueTopic()
);

}


return topics;


}
