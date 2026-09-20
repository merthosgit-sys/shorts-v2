import {
TOPIC_LIBRARY
} from "../data/topic-library.js";


export class LocalAIService {


generateResearch(topic:string){

const item =
TOPIC_LIBRARY.find(
x=>x.topic===topic
);


if(!item){

return {

text:
`${topic} is an interesting technology story.`,

sources:[]

};

}



return {

text:
`
Topic:
${item.topic}

Main facts:

${item.facts.join("\n")}

`,

sources:[]

};


}




generateBlueprint(topic:string){


const item =
TOPIC_LIBRARY.find(
x=>x.topic===topic
);



return {


topic:item?.topic ?? topic,


title:item?.topic ?? topic,


description:
`A short explanation about ${topic}.`,



hook:
item?.hook ??
`The hidden story behind ${topic}.`,



scenes:

(item?.facts ?? [

"Technology changes the way people live."

]).slice(0,5)
.map(
(fact,index)=>({

narration:fact,


searchQueries:
[
item?.visuals?.[index]
||
"technology animation",

"modern technology"

]

})

)


};



}
