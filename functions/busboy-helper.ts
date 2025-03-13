import { APIGatewayEvent } from 'aws-lambda';
import { Stream } from 'stream';
import Busboy from 'busboy';

export async function MakeRecipeWithFile(event: APIGatewayEvent): Promise<{ recipeName: string, preparation: string, ingredients: string, file?: Stream, fileName?: string }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { 'content-type': event.headers['Content-Type'] || '' } });

    let recipeName = '';
    let preparation = '';
    let ingredients = '';
    let file: Stream | undefined;

    busboy.on("field", (fieldName, val) => {
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
      if (fieldName === 'photo') {
        file = fileStream;
      }
    });

    busboy.on('finish', () => {
      resolve({ recipeName, preparation, ingredients, file });
    });

    busboy.on('error', (error: any) => {
      reject(error);
    });

    if (event.body) {
      const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;

      busboy.write(body);
      busboy.end();
    } else {
      reject(new Error("Request body is empty"));
    }
  });
}
