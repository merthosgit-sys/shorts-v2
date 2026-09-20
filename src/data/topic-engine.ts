import {
hasVideo,
addVideo
} from "./video-memory.js";



const SUBJECTS = {


technology:[

"WiFi",
"Bluetooth",
"GPS",
"QR Codes",
"Smartphones",
"Artificial Intelligence",
"Robots",
"Microchips",
"Electric Cars",
"Satellites",
"Internet",
"Battery Technology",
"Virtual Reality",
"3D Printing"

],


science:[

"Black Holes",
"DNA",
"Quantum Physics",
"Gravity",
"Lightning",
"Time",
"Energy",
"Human Brain",
"Ocean",
"Volcanoes"

],


history:[

"Ancient Machines",
"Lost Inventions",
"First Computers",
"Old Cars",
"Early Aviation",
"Forgotten Scientists"

],


engineering:[

"Bridges",
"Skyscrapers",
"Power Plants",
"Engines",
"Factories",
"Electrical Systems"

],


daily:[

"Keyboard",
"Barcode",
"Camera",
"LED Lights",
"Microwave",
"Elevator",
"Printer"

]


};






const TITLE_PATTERNS=[


"The Hidden Story Behind {x}",


"How {x} Changed The World",


"Why Was {x} Invented?",


"How Does {x} Really Work?",


"The Forgotten History Of {x}",


"The Technology Secret Of {x}",


"The Surprising Truth About {x}",


"Nobody Explains {x} Like This"


];





const ANGLES=[

"history",

"engineering",

"unknown facts",

"future technology",

"how it works",

"origin story",

"hidden details"

];







function random<T>(
array:T[]
):T{

return array[
Math.floor(
Math.random()*array.length
)
];

}







export async function generateUniqueTopic(){


let attempts=0;



while(attempts<500){


const category =
random(
Object.keys(SUBJECTS)
);



const subject =
random(
(SUBJECTS as any)[category]
);



const pattern =
random(
TITLE_PATTERNS
);



const title =
pattern.replace(
"{x}",
subject
);



const angle =
random(
ANGLES
);



if(
await hasVideo(title)
){

attempts++;

continue;

}




await addVideo({

title,

topic:subject,

hook:
`The hidden truth behind ${subject}`,

angle,

createdAt:
new Date()
.toISOString()

});





return {


topic:title,

baseTopic:subject,

category,

angle,


searchQueries:[

subject,

`${subject} technology`,

"documentary",

"cinematic technology"

]


};


}



throw new Error(
"Unique topic generation failed"
);



}







export async function generateTopics(
count:number
){


const result=[];


for(
let i=0;
i<count;
i++
){

result.push(
await generateUniqueTopic()
);

}


return result;


}
