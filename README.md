# thumbnailer

This is an Express app that downloads your image given its url and returns a thunbnail version of the image.

npm install
npm start
npm test

wget localhost:3000/[:urlBase64]/[:maxWidth]/[:maxHeight]/[:signatureBase64.][:extension]


convert your url to base64:
echo -n <your url> | base64

If you try with a dummy signature, a 403 will be the result. Then copy the correct signature from 
console and replace the dummy one.
