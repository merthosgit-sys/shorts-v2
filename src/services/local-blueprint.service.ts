import type {
  Blueprint,
  ResearchResult
} from "../domain/blueprint.js";



const HOOKS:string[] = [

"Most people use this every day, but they don't know the incredible story behind it.",

"This invention looks simple, but its history changed the world.",

"You use this technology constantly, but almost nobody knows how it started.",

"The hidden story behind this invention is more surprising than you think."

];



const ENDINGS:string[] = [

"This is why this technology became an important part of modern life.",

"Today billions of people use it without knowing its fascinating history.",

"A simple idea became one of the technologies that shaped our world."

];





const VISUAL_MAP:Record<string,string[]> = {


wifi:[

"wifi router close up",

"wireless signal animation",

"computer network",

"internet technology"

],



gps:[

"GPS satellite earth",

"navigation technology",

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

"future AI"

],



default:[

"technology documentary",

"innovation laboratory",

"digital world",

"modern computer"

]


};






function random<T>(
array:readonly T[]
):T{


const value =
array[
Math.floor(
Math.random()*array.length
)
];


if(value===undefined){

throw new Error(
"Empty array"
);

}


return value;

}








function detectVisual(
topic:string
):string[]{


const key =
topic
.toLowerCase()
.replace(/[^a-z]/g,"");



for(
const item of Object.keys(VISUAL_MAP)
){

const value =
VISUAL_MAP[item];


if(
key.includes(item) &&
value
){

return value;

}


}



return VISUAL_MAP.default ??
[

"technology documentary"

];


}









function createScenes(
topic:string
){


const visuals =
detectVisual(topic);



return [


{

narration:
`${topic} started with a simple idea, but it became one of the most important technologies in modern life. Behind this invention there are years of research, engineering and unexpected discoveries.`,

searchQueries:[

visuals[0] ?? "technology",

visuals[1] ?? "innovation"

]

},



{


narration:
"Scientists and engineers had to solve many difficult problems before this technology became possible. Every improvement made it faster, smaller and more useful for people around the world.",


searchQueries:[

visuals[2] ?? "engineering",

visuals[3] ?? "laboratory"

]

},



{


narration:
"Over time this invention entered our daily lives. Many people use it every day without realizing how much science and creativity exists behind it.",


searchQueries:[

"people using technology",

"digital lifestyle"

]

},



{


narration:
"Today this technology continues to improve and researchers are still finding new ways to make it more powerful, efficient and accessible.",


searchQueries:[

"future technology",

"innovation"

]

},



{


narration:
random(ENDINGS),


searchQueries:[

"world technology",

"future innovation"

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
.startsWith("topic")
)
?.replace(
 /topic:/i,
 ""
)
.trim()
??
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
`A documentary style explanation about ${cleanTopic} and how it changed modern technology.`,



hook:
random(HOOKS),



scenes:
createScenes(cleanTopic)



};


}


}
