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
  ):ResearchResult{


    const item =
    TOPIC_LIBRARY.find(
      x => x.topic === topic
    );



    if(!item){

      return {

        text:
`
Topic:
${topic}

Main facts:

${topic} is an interesting subject.
It has a story connected with technology,
science and everyday life.

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
  ):Blueprint{



    const item =
    TOPIC_LIBRARY.find(
      x=>x.topic===topic
    );



    const facts =
    item?.facts ??
    [

      "Technology changes the way people live.",

      "Engineers improve this technology over time.",

      "Today millions of people use it."

    ];



    const visuals =
    item?.visuals ??
    [

      "technology animation",

      "computer laboratory",

      "modern innovation"

    ];





    return {



      topic,


      title:
      `The Hidden Story Behind ${topic}`,


      description:
      `A short documentary explaining the history and technology behind ${topic}.`,



      hook:
      item?.hook ??
      `The hidden story behind ${topic} is more interesting than you think.`,




      scenes:

      facts
      .slice(0,5)
      .map(
        (fact,index)=>({

          narration:fact,


          searchQueries:[

            visuals[index % visuals.length],

            "technology documentary"

          ]

        })

      )



    };


  }





}
