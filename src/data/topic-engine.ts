export const CATEGORIES = {


technology:[

"WiFi",
"Bluetooth",
"QR Codes",
"GPS",
"Smartphones",
"Artificial Intelligence",
"Internet",
"Computer History",
"Robotics",
"Electric Cars",
"Battery Technology",
"Microchips",
"Satellites",
"Space Technology",
"Virtual Reality",
"3D Printing",
"Cloud Computing",
"Cybersecurity"

],



science:[

"Black Holes",
"Quantum Physics",
"DNA",
"Human Brain",
"Gravity",
"Atoms",
"Time",
"Energy",
"Lightning",
"Volcanoes",
"Deep Ocean",
"Evolution",
"Weather",
"Plants",
"Animals"

],



history:[

"Ancient Inventions",
"Lost Technologies",
"Famous Discoveries",
"Old Machines",
"First Computers",
"First Cars",
"First Airplanes",
"Ancient Engineering",
"Historical Mysteries",
"Forgotten Scientists"

],



engineering:[

"Bridges",
"Buildings",
"Power Plants",
"Electrical Systems",
"Engines",
"Aircraft",
"Ships",
"Factories",
"Machines",
"Construction Technology"

],



daily:[

"Coffee Machines",
"Microwave Ovens",
"Elevators",
"Barcode",
"Keyboard",
"Touchscreens",
"Camera Technology",
"LED Lights",
"Refrigerators",
"Printers"

]

};





const HOOKS=[

"The hidden story behind {x}",

"Why was {x} invented?",

"The surprising truth about {x}",

"How {x} changed the world",

"You use {x} every day but don't know this",

"The technology secret of {x}",

"Nobody explains {x} like this",

"The forgotten history of {x}",

"How does {x} actually work?"

];





const ANGLES=[

"history",

"technology",

"science",

"engineering",

"unknown facts",

"future impact",

"how it works"

];






const VISUALS={


technology:[

"computer laboratory",
"digital technology",
"futuristic interface",
"engineers working",
"electronic devices"

],


science:[

"science laboratory",
"space animation",
"microscope",
"scientists research",
"nature documentary"

],


history:[

"old photograph",
"ancient machine",
"historical documentary",
"museum artifact",
"old technology"

],


engineering:[

"engineering project",
"construction site",
"machines working",
"industrial factory",
"technology animation"

],


daily:[

"modern home",
"everyday object",
"close up product",
"people using technology",
"modern lifestyle"

]


};






function random<T>(array:T[]):T{

return array[
Math.floor(Math.random()*array.length)
];

}







export interface GeneratedTopic {


topic:string;

angle:string;

category:string;

searchQueries:string[];

}




export function generateTopic():GeneratedTopic{


const category =
random(
Object.keys(CATEGORIES)
);



const subject =
random(
(CATEGORIES as any)[category]
);



const hook =
random(HOOKS)
.replace(
"{x}",
subject
);



return {


topic:
hook,


angle:
random(ANGLES),


category,


searchQueries:
[
subject,
...(VISUALS as any)[category]
.slice(0,3)
]


};


}







export function generateTopics(
count:number
){


const results:GeneratedTopic[]=[];


while(results.length<count){


const topic =
generateTopic();



if(
!results.find(
x=>x.topic===topic.topic
)
){

results.push(topic);

}


}


return results;


}
