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


function getError(error: unknown): ErrorLike {

  if (
    typeof error !== "object" ||
    error === null
  ) {
    return {};
  }


  const e =
    error as Record<string, unknown>;


  const result: ErrorLike = {};


  if (
    typeof e.status === "number" ||
    typeof e.status === "string"
  ) {
    result.status = e.status;
  }


  if (
    typeof e.code === "number" ||
    typeof e.code === "string"
  ) {
    result.code = e.code;
  }


  if (
    typeof e.message === "string"
  ) {
    result.message = e.message;
  }


  return result;

}





function isQuotaError(
error: unknown
): boolean {


  const e =
    getError(error);


  const message =
    e.message?.toLowerCase() ?? "";


  return (

    message.includes("quota") ||
    message.includes("429") ||
    message.includes("resource_exhausted") ||
    e.status === 429

  );

}







export class GeminiService {


  readonly #client?: GoogleGenAI;

  readonly #model: string;

  readonly #localAI: LocalAIService;



  constructor(
    apiKey: string,
    model: string
  ) {


    this.#model = model;

    this.#localAI =
      new LocalAIService();


    if (apiKey.trim()) {

      this.#client =
        new GoogleGenAI({
          apiKey
        });

    }


  }







  public async planTopics(
    niche: string,
    language: string,
    count: number
  ): Promise<readonly TopicPlan[]> {


    if (!this.#client) {

      return this.localTopics(count);

    }



    try {


      const response =
        await this.#client.models.generateContent({

          model: this.#model,

          contents:
`
Create ${count} YouTube Shorts topics.

Niche:
${niche}

Language:
${language}

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
        response.text?.trim();



      if (!text) {

        throw new Error(
          "Empty response"
        );

      }



      return topicPlanSchema.parse(
        JSON.parse(text)
      ).topics;



    }
    catch(error) {


      console.log(
        isQuotaError(error)
        ?
        "[Gemini quota] Local topics"
        :
        "[Gemini failed] Local topics"
      );


      return this.localTopics(count);

    }


  }








  public async researchTopic(
    niche: string,
    _language: string,
    requestedTopic: string,
    angle?: string
  ): Promise<ResearchResult> {


    if (this.#client) {


      try {


        const response =
          await this.#client.models.generateContent({

            model:this.#model,

            contents:
`
Research this topic:

${requestedTopic}

Niche:
${niche}

Angle:
${angle ?? ""}

Give factual information.
`

          });



        const text =
          response.text?.trim();



        if(text){

          return {

            text,

            sources:[]

          };

        }



      }
      catch {

        console.log(
          "[Gemini research fallback]"
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


      try {


        const response =
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

5 scenes
55-95 words narration

Return JSON only:

{
topic:"",
title:"",
description:"",
hook:"",
scenes:[
{
narration:"",
searchQueries:[""]
}
]
}


Research:

${research.text}

`

          });



        const text =
          response.text?.trim();



        if(text){

          return blueprintSchema.parse(
            JSON.parse(text)
          );

        }


      }
      catch {

        console.log(
          "[Gemini blueprint fallback]"
        );

      }


    }




    const topic =
      research.text
      .split("\n")
      .find(
        line =>
        line.startsWith("Topic:")
      )
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
  ):TopicPlan[] {


    const topics = [

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
      (_,index)=>({

        topic:
        topics[index % topics.length]
        ??
        "Technology Story",


        angle:
        "The surprising story behind this technology"

      })

    );


  }


}
