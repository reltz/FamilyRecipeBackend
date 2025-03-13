import { APIGatewayEvent } from 'aws-lambda';
import { Stream } from 'stream';
import Busboy from 'busboy';

export async function MakeRecipeWithFile(event: APIGatewayEvent): Promise<{ recipeName: string, preparation: string, ingredients: string, file?: Stream }> {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';

    console.log(`Content-type in busboy helper: ${contentType}`);
    const busboy = Busboy({ headers: { 'content-type': contentType } });

    // const busboy = Busboy({ headers: { 'content-type': 'multipart/form-data' } });


    let recipeName = '';
    let preparation = '';
    let ingredients = '';
    let file: Stream | undefined;

    busboy.on("field", (fieldName, val) => {
      console.log(`Processing fields in bussboys`)
      switch(fieldName) {
        case 'name':
          recipeName = val;
          break;
        case 'preparation':
          preparation = val;
          break;
        case 'ingredients':
          ingredients = val;
          break;
      }
    });

    busboy.on('file', (fieldName: string, fileStream: Stream) => {
      console.log("received file in busboy on");
      // BREAKS HERE!
      if (fieldName === 'photo') {
        file = fileStream;
      }
    });

    busboy.on('finish', () => {
      console.log("finishing busboy file");
      resolve({ recipeName, preparation, ingredients, file });
    });

    busboy.on('error', (error: any) => {
      console.error(`Error on busboy: ${JSON.stringify(error)}`)
      reject(error);
    });

    if (event.body) {
      const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
      console.info(`writing body! ${body.length}`)
      busboy.write(body);
      busboy.end();
    } else {
      reject(new Error("Request body is empty"));
    }
  });
}
