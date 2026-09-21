import {
  TOPIC_LIBRARY
} from "../data/topic-library.js";


import type {
  ResearchResult,
  Blueprint
} from "../domain/blueprint.js";





export class LocalAIService {




  public generateResearch(
    topic:string
  ):ResearchResult {



    const item =
      TOPIC_LIBRARY.find(
        (x)=>x.topic===topic
      );




    if(!item){


      return {


        text:
`
Topic:
${topic}


Main facts:

${topic} is an interesting technology story.
It connects science, engineering and everyday life.

`,

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









  public generateBlueprint(
    topic:string
  ):Blueprint {



    const item =
      TOPIC_LIBRARY.find(
        (x)=>x.topic===topic
      );





    const visuals:string[] =
      item?.visuals ??
      [

        "technology animation",

        "computer laboratory",

        "modern innovation",

        "digital world"

      ];







    return {


      topic,



      title:
      `The Hidden Story Behind ${topic}`,



      description:
      `A documentary style Shorts video explaining the history, technology and hidden details behind ${topic}.`,



      hook:
      item?.hook ??
      `The hidden story behind ${topic} is more interesting than you think.`,




      scenes:[



        {


          narration:
          `${topic} started with a simple idea, but it became one of the most important technologies in modern life. Behind this invention there are years of research, experiments and engineering decisions.`,



          searchQueries:[

            visuals[0] ?? "technology",

            visuals[1] ?? "innovation"

          ]


        },






        {


          narration:
          `Scientists and engineers had to solve many difficult problems before this technology became successful. They tested different solutions and improved the system step by step.`,



          searchQueries:[

            visuals[2] ?? "engineering",

            "technology laboratory"

          ]


        },







        {


          narration:
          `After years of development, this invention became available to millions of people. Today many users benefit from it every day without knowing the complex story behind it.`,



          searchQueries:[

            "people using technology",

            "digital lifestyle"

          ]


        },







        {


          narration:
          `Modern versions continue to improve with new discoveries. Engineers are still finding ways to make this technology faster, smarter and more useful for the future.`,



          searchQueries:[

            "future technology",

            "innovation documentary"

          ]


        },







        {


          narration:
          `This is why the story behind ${topic} shows how human creativity and science can transform a simple idea into something that changes the world.`,



          searchQueries:[

            "world technology",

            "future innovation"

          ]


        }



      ]



    };



  }




}
