import { GoogleGenAI } from '@google/genai';
import {
  blueprintSchema,
  topicPlanSchema,
  type Blueprint,
  type ResearchResult,
  type TopicPlan,
} from '../domain/blueprint.js';

import { LocalAIService } from './local-ai.service.js';



interface ErrorLike {
  status?: number | string;
  code?: number | string;
  message?: string;
}



function getError(error:unknown):ErrorLike {

  if(typeof error !== 'object' || error === null){
    return {};
  }


  const e =
    error as Record<string,unknown>;


  return {

    status:
      typeof e.status === 'number' ||
      typeof e.status === 'string'
      ? e.status
      : undefined,


    code:
      typeof e.code === 'number' ||
      typeof e.code === 'string'
      ? e.code
      : undefined,


    message:
      typeof e.message === 'string'
      ? e.message
      : undefined

  };

}



function isQuotaError(error:unknown){

  const e=getError(error);

  const msg =
    e.message?.toLowerCase() ?? "";


  return (

    msg.includes("quota") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    e.status===429

  );

}






export class GeminiService {


  readonly #client?:GoogleGenAI;

  readonly #model:string;

  readonly #localAI:LocalAIService;



  constructor(
    apiKey:string,
    model:string
  ){


    this.#model=model;

    this.#localAI =
      new LocalAIService();



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
  ):Promise<readonly TopicPlan[]> {



    if(!this.#client){

      return this.localTopics(count);

    }



    try{


      const result =
      await this.#client.models.generateContent({

        model:this.#model,


        contents:
`
Create ${count} YouTube Shorts topics.

Niche:
${niche}

Language:
${language}


Rules:

- curiosity based
- evergreen
- suitable for 40 second videos
- visually searchable

Return JSON:

{
 "topics":[
 {
  "topic":"",
  "angle":""
 }
 ]
}

`


      });



      const text =
        result.text?.trim();



      if(!text)
        throw new Error("Empty Gemini response");



      return topicPlanSchema.parse(
        JSON.parse(text)
      ).topics;



    }
    catch(error){


      console.log(
        isQuotaError(error)
        ?
        "[Gemini quota exceeded] Local topics used"
        :
        "[Gemini failed] Local topics used"
      );


      return this.localTopics(count);

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


        const result =
        await this.#client.models.generateContent({


          model:this.#model,


          contents:
`
Research this YouTube Shorts topic.

Topic:
${requestedTopic}


Niche:
${niche}


Angle:
${angle ?? ""}


Give short factual information.

Avoid:
fake facts,
rumors,
unsupported claims.

`

        });



        const text =
          result.text?.trim();



        if(text){

          return {

            text,

            sources:[]

          };

        }



      }
      catch(error){

        console.log(
          "[Gemini research failed] Local research"
        );

      }


    }




    return this.#localAI.generateResearch(
      requestedTopic
    );



  }









  public async createBlueprint(
    research:ResearchResult,
    niche:string,
    language:string

  ):Promise<Blueprint>{



    if(this.#client){


      try{


        const result =
        await this.#client.models.generateContent({


          model:this.#model,


          contents:
`
Create YouTube Shorts blueprint.

Language:
${language}

Niche:
${niche}


Rules:

- 5 scenes
- total narration 55-95 words
- first scene must have hook
- each scene needs Pexels search keywords


Research:

${research.text}



Return ONLY JSON:

{
"topic":"",
"title":"",
"description":"",
"hook":"",
"scenes":[
 {
 "narration":"",
 "searchQueries":[
 ""
 ]
 }
]
}

`

        });



        const text =
          result.text?.trim();



        if(text){


          return blueprintSchema.parse(
            JSON.parse(text)
          );


        }



      }
      catch(error){

        console.log(
          "[Gemini blueprint failed] Local blueprint"
        );

      }


    }





    const topic =
    research.text
    .split("\n")
    .find(x=>x.startsWith("Topic:"))
    ?.replace("Topic:","")
    .trim()
    ??
    "Technology Story";



    return this.#localAI.generateBlueprint(
      topic
    );



  }









  private localTopics(
    count:number
  ):TopicPlan[]{


    const topics=[

      "How WiFi Was Invented",

      "The Hidden Story Of QR Codes",

      "How GPS Finds Your Location",

      "The Strange Origin Of Bluetooth",

      "Why Keyboard Letters Are Arranged Like This",

      "The First Internet Message Ever Sent",

      "How Electric Cars Changed Technology",

      "Hidden Technology Inside Everyday Objects"

    ];



    return Array.from(
      {length:count},
      (_,i)=>({

        topic:
        topics[i % topics.length],


        angle:
        "The surprising story behind this technology"

      })
    );


  }



}
