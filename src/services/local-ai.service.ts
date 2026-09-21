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

${topic}, teknoloji ve bilimin gelişiminde önemli bir yere sahip olan ilginç bir konudur.

Bu teknoloji zaman içinde gelişerek insanların günlük hayatını değiştirmiştir.

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

        "technology documentary",

        "innovation laboratory",

        "digital technology",

        "future technology"

      ];







    return {



      topic,




      title:

      `${topic} Hakkında Bilinmeyen Gerçekler`,





      description:

      `${topic} teknolojisinin tarihini ve dünyayı nasıl değiştirdiğini anlatan kısa belgesel videosu.`,






      hook:

      item?.hook ??

      `${topic} her gün kullandığımız ancak arkasındaki hikayeyi çoğu kişinin bilmediği bir teknoloji.`,








      scenes:[





        {

          narration:

          `${topic}, basit bir fikir olarak başlayan ancak zaman içinde dünyanın en önemli teknolojilerinden biri haline gelen etkileyici bir gelişim hikayesine sahiptir. Bu teknolojinin arkasında yıllarca süren araştırmalar ve büyük mühendislik çalışmaları vardır.`,



          searchQueries:[

            visuals[0] ?? "technology",

            visuals[1] ?? "innovation"

          ]

        },









        {

          narration:

          `Bilim insanları ve mühendisler bu teknolojiyi geliştirmek için birçok zorlu problemi çözmek zorunda kaldı. Yapılan deneyler ve yeni fikirler sayesinde sistem daha hızlı, daha küçük ve daha kullanışlı hale geldi.`,



          searchQueries:[

            visuals[2] ?? "engineering",

            "technology research laboratory"

          ]

        },









        {

          narration:

          `Yıllar süren geliştirme sürecinden sonra bu teknoloji milyonlarca insanın kullanımına sunuldu. Bugün birçok kişi bu teknolojiyi her gün kullanıyor ancak arkasındaki karmaşık süreci bilmiyor.`,



          searchQueries:[

            "people using technology",

            "modern digital life"

          ]

        },









        {

          narration:

          `Günümüzde bu teknoloji hâlâ gelişmeye devam ediyor. Yeni araştırmalar sayesinde daha güçlü, daha hızlı ve gelecekte daha önemli bir hale gelmesi bekleniyor.`,



          searchQueries:[

            "future technology",

            "scientific innovation"

          ]

        },









        {

          narration:

          `${topic} bize insanların merakı, bilimi ve mühendisliği birleştirerek dünyayı nasıl değiştirebildiğini gösteriyor. Küçük bir fikir, zaman içinde büyük bir dönüşüme neden olabilir.`,



          searchQueries:[

            "world technology",

            "future innovation"

          ]

        }



      ]





    };




  }







}
