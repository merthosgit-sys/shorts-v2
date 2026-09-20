import type { Blueprint, ResearchResult } from "../domain/blueprint.js";


const HOOKS = [

"Most people use this every day, but they don't know the real story behind it.",

"This invention changed the world, but its origin is surprising.",

"You probably use this technology without knowing how it works.",

"The hidden story behind this everyday technology is fascinating.",

"This simple idea became one of the biggest inventions in history."

];



const ENDINGS = [

"This is why this technology became part of modern life.",

"Today, millions of people use it without thinking about its hidden history.",

"A simple idea became a technology that changed the world.",

"Behind everyday objects, there is always a surprising story."

];





const VISUAL_MAP:Record<string,string[]> = {


wifi:[

"wifi router close up",

"wireless signal animation",

"computer network",

"technology laboratory"

],



gps:[

"GPS satellite earth",

"navigation map animation",

"satellite communication",

"smartphone map"

],



bluetooth:[

"bluetooth devices",

"wireless technology",

"smart devices",

"computer connection"

],



ai:[

"artificial intelligence",

"robot technology",

"AI computer",

"futuristic technology"

],



default:[

"technology documentary",

"modern computer",

"innovation laboratory",

"digital world"

]


};







function random<T>(array:T[]):T{

return array[
Math.floor(
Math.random()*array.length
)
];

}







function detectVisual(topic:string){


const key =
topic
.toLowerCase()
.replace(/[^a-z]/g,"");



for(const item of Object.keys(VISUAL_MAP)){


if(key.includes(item)){

return VISUAL_MAP[item];

}


}


return VISUAL_MAP.default;


}







function createScenes(
topic:string
){


const visuals =
detectVisual(topic);



return [


{
narration:
`${topic} has a fascinating story that started with a simple idea and later became an important part of modern life.`,

searchQueries:[
visuals[0],
visuals[1]
]

},



{
narration:
"Engineers and scientists developed this technology by solving difficult problems and creating new solutions.",

searchQueries:[
visuals[2],
visuals[3]
]

},



{
narration:
"Over time, improvements made it faster, smaller and easier for everyone to use around the world.",

searchQueries:[
"technology evolution",
"modern innovation"
]

},



{
narration:
"Today, this invention works silently in the background and helps millions of people every day.",

searchQueries:[
"people using technology",
"digital lifestyle"
]

},



{
narration:
random(ENDINGS),

searchQueries:[
"future technology",
"world technology"
]

}



];

}





export class LocalBlueprintService {



public create(
research:ResearchResult
):Blueprint{



const topic =
research.text
.split("\n")
.find(
line =>
line.toLowerCase()
.includes("topic")
)
?.replace(/topic:/i,"")
.trim()
||
"Unknown Technology";




const cleanTopic =
topic.length>5
?
topic
:
"Unknown Technology";




return {


topic:cleanTopic,


title:
`The Hidden Story Behind ${cleanTopic}`,



description:
`A short documentary explaining how ${cleanTopic} changed the world and why it matters today.`,



hook:
random(HOOKS),



scenes:
createScenes(cleanTopic)



};


}



}
