import { GoogleGenAI, Type } from '@google/genai';
import {
  blueprintSchema,
  topicPlanSchema,
  type Blueprint,
  type ResearchResult,
  type TopicPlan,
} from '../domain/blueprint.js';


const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;


interface ErrorLike {
  readonly status?: number | string;
  readonly code?: number | string;
  readonly message?: string;
}



function sleep(ms:number):Promise<void>{

  return new Promise(resolve=>{
    setTimeout(resolve,ms);
  });

}



function getError(error:unknown):ErrorLike{

  if(typeof error !== 'object' || error===null){

    return {};

  }


  const e = error as Record<string,unknown>;


  return {

    status:
      typeof e.status === 'string' || typeof e.status === 'number'
      ? e.status
      : undefined,


    code:
      typeof e.code === 'string' || typeof e.code === 'number'
      ? e.code
      : undefined,


    message:
      typeof e.message === 'string'
      ? e.message
      : undefined

  };

}




function isQuotaError(error:unknown):boolean{

  const e=getError(error);

  const msg=e.message?.toLowerCase() ?? "";


  return (

    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("429") ||
    e.status===429 ||
    e.code===429

  );

}





async function withRetry<T>(
name:string,
fn:()=>Promise<T>
):Promise<T>{


let lastError:unknown;



for(let i=1;i<=MAX_RETRIES;i++){


try{

return await fn();

}

catch(error){


lastError=error;



if(isQuotaError(error)){

throw error;

}



if(i===MAX_RETRIES){

break;

}



await sleep(
BASE_DELAY_MS*i
);


console.log(
`[Gemini] ${name} retry ${i}/${MAX_RETRIES}`
);


}



}



throw lastError;



}







export class GeminiService {


readonly #client?:GoogleGenAI;

readonly #model:string;



constructor(
apiKey:string,
model:string
){


this.#model=model;


if(apiKey?.trim()){

this.#client =
new GoogleGenAI({
apiKey
});

}



}
export class GeminiService {

  readonly #client?: GoogleGenAI;
  readonly #model:string;


  constructor(
    apiKey:string,
    model:string
  ){

    this.#model=model;

    if(apiKey?.trim()){

      this.#client =
        new GoogleGenAI({
          apiKey
        });

    }

  }





  public async planTopics(
    niche:string,
    language:string,
    count:number
  ):Promise<readonly TopicPlan[]>{


    if(!this.#client){

      return this.localTopics(niche,count);

    }



    try{


      const response =
      await withRetry(
      "Plan topics",
      async()=>{

        return this.#client!.models.generateContent({

          model:this.#model,

          contents:
          `
          Create ${count} YouTube Shorts topics.

          Niche:
          ${niche}

          Language:
          ${language}


          Rules:

          - curiosity driven
          - evergreen
          - visually searchable
          - explainable in 30 seconds
          - no fake claims

          `,


          config:{
            responseMimeType:"application/json",

            responseSchema:{

              type:Type.OBJECT,

              properties:{

                topics:{
                  type:Type.ARRAY,

                  items:{

                    type:Type.OBJECT,

                    properties:{

                      topic:{
                        type:Type.STRING
                      },

                      angle:{
                        type:Type.STRING
                      }

                    }

                  }

                }

              }

            }

          }

        });


      });



      const text=response.text?.trim();


      if(!text)
        throw new Error("empty response");


      return topicPlanSchema.parse(
        JSON.parse(text)
      ).topics;



    }
    catch(error){


      console.log(
        "[LOCAL AI] Topic generator used"
      );


      return this.localTopics(
        niche,
        count
      );


    }



  }







  public async researchTopic(
    niche:string,
    language:string,
    requestedTopic:string,
    angle?:string

  ):Promise<ResearchResult>{



    if(this.#client){


      try{


        const response =
        await withRetry(
        "Research",
        async()=>{


          return this.#client!.models.generateContent({

            model:this.#model,


            contents:
`
Research this Shorts topic:

${requestedTopic}


Niche:
${niche}


Angle:
${angle ?? ""}


Give:

- important facts
- historical background
- why people care
- visual ideas


Avoid:
fake facts
rumors
unsupported claims

`

          });


        });



        const text=response.text?.trim();


        if(text){

          return {
            text,
            sources:[]
          };

        }



      }
      catch(error){


        console.log(
        "[LOCAL AI] Research fallback"
        );


      }


    }





    return {

      text:
`
Topic:
${requestedTopic}


This topic is interesting because it connects technology,
history and everyday life.

The video should explain:
- what it is
- how it started
- why it matters today


Focus on simple facts and visual storytelling.

`,

      sources:[]

    };



  }









  public async createBlueprint(
    research:ResearchResult,
    niche:string,
    language:string

  ):Promise<Blueprint>{



    if(this.#client){


      try{


        const response =
        await withRetry(
        "Blueprint",
        async()=>{


          return this.#client!.models.generateContent({

            model:this.#model,


            contents:
`
Create a YouTube Shorts blueprint.

Language:
${language}


Niche:
${niche}


Rules:

5-8 scenes

Total narration:
55-95 words


Scene 1:
strong hook


Each scene:
- narration
- 2-4 English Pexels searches


Research:

${research.text}


`,



config:{

responseMimeType:"application/json",

responseSchema:{

type:Type.OBJECT,

properties:{


topic:{
type:Type.STRING
},


title:{
type:Type.STRING
},


description:{
type:Type.STRING
},


hook:{
type:Type.STRING
},



scenes:{

type:Type.ARRAY,

items:{

type:Type.OBJECT,


properties:{


narration:{
type:Type.STRING
},


searchQueries:{

type:Type.ARRAY,

items:{
type:Type.STRING
}

}

},


required:[
"narration",
"searchQueries"
]


}


}


},


required:[
"topic",
"title",
"description",
"hook",
"scenes"
]


}


}



          });


        });



        const text=response.text?.trim();



        if(text){

          return blueprintSchema.parse(
            JSON.parse(text)
          );

        }




      }
      catch(error){

        console.log(
        "[LOCAL AI] Blueprint fallback"
        );

      }


    }




    return this.localBlueprint(
      research
    );



  }








private localTopics(
niche:string,
count:number
):TopicPlan[]{


const topics=[

"How WiFi Was Invented",

"The Hidden Story Of QR Codes",

"Why Airplane Mode Exists",

"How GPS Finds Your Location",

"The Strange Origin Of Bluetooth",

"How Electric Cars Changed Technology",

"Why Computer Keyboard Letters Are Arranged Like This",

"The First Internet Message Ever Sent",

"How Smartphones Changed The World",

"Hidden Technology Inside Everyday Objects"


];


return Array.from(
{length:count},
(_,i)=>({

topic:topics[i % topics.length],

angle:
`The surprising story behind ${topics[i % topics.length]}`

})

);


}









private localBlueprint(
research:ResearchResult

):Blueprint{


const topic =
research.text
.split("\n")
.find(x=>x.includes("Topic:"))
?.replace("Topic:","")
.trim()
||
"Unknown Technology Story";





return {

topic,


title:
topic.length>70
? topic.substring(0,70)
: topic,


description:
`A short documentary explaining the hidden story behind ${topic}.`,


hook:
`You use this every day, but you probably don't know its real story.`,



scenes:[


{
narration:
`${topic} has a fascinating story that changed the way people use technology today.`,

searchQueries:[
"modern technology",
"computer laboratory"
]

},



{
narration:
"It started from research and ideas that slowly became part of everyday life.",

searchQueries:[
"scientists laboratory",
"technology research"
]

},



{
narration:
"Over time engineers improved this invention and made it accessible worldwide.",

searchQueries:[
"engineering technology",
"innovation"
]

},



{
narration:
"Today millions of people use this technology without thinking about how it works.",

searchQueries:[
"people using smartphone",
"digital technology"
]

},



{
narration:
"The hidden story behind this invention shows how science changes our world.",

searchQueries:[
"future technology",
"earth digital network"
]

}



]


};



}



}
