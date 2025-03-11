import { APIGatewayEvent } from 'aws-lambda';
import * as Busboy from 'busboy';
import { Stream } from 'stream';

export async function MakeRecipeWithFile(event: APIGatewayEvent): Promise<{ recipeName: string, preparation: string, ingredients: string, file?: Stream, fileName?: string }> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: { 'content-type': event.headers['Content-Type'] || '' } });

    let recipeName = '';
    let preparation = '';
    let ingredients = '';
    let file: Stream | undefined;
    let fileName: string | undefined;

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

    busboy.on('file', (fieldName: string, fileStream: Stream, name: string) => {
      if (fieldName === 'photo') {
        file = fileStream;
        fileName = name;
      }
    });

    busboy.on('finish', () => {
      resolve({ recipeName, preparation, ingredients, file, fileName });
    });

    busboy.on('error', (error: any) => {
      reject(error);
    });

    busboy.write(event.body, 'base64');
    busboy.end();
  });
}
