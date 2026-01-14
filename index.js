//----------------------------------
//----------------------------------
//
const _express = require("express");
const app = _express();
const cors = require("cors");
const port = 3000;
const fs = require("fs");
const path = require("path");
const _multer = require("multer");
const _upload = _multer({ dest: "img/signatures/dest/" }); // Store uploaded images in 'uploads' directory

app.use(_express.json());

app.use(cors());
//----------------------------------
//----------------------------------
//
function doOcr(p_imagePath, res) {
  //
  const Tesseract = require("tesseract.js");
  //
  async function recognizeText(imagePath, res) {
    const {
      data: { text },
    } = await Tesseract.recognize(imagePath, "eng");
    const msg = "text from image :" + text;
    console.debug(msg);
    res.status(200).json({ message: msg });
  }
  //
  return recognizeText(p_imagePath, res);
}
//
app.post("/uploadFromUIX", _upload.single("image"), (req, res) => {
  const imagePath = req.file.path; // Access path of uploaded image
  console.debug("Image uploaded successfully:", imagePath);
  res.send("Image uploaded successfully");
  const msg = doOcr(imagePath);
});
//
app.post("/upload", (req, res) => {
  // Handle the base64 image data as needed (e.g., save to disk, process, etc.)
  // ...
  // Base64-encoded image data
  const base64Image = req.body.base64Image;

  // Extract the file extension and data from the base64 string
  const matches = base64Image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
  const fileExtension = matches[1];
  const base64Data = matches[2];

  // Create a buffer from the base64 data
  const imageBuffer = Buffer.from(base64Data, "base64");

  // Create a unique filename based on timestamp
  const filename = `image_${Date.now()}.${fileExtension}`;

  // Specify the file path where the image will be saved
  //const filePath      = path.join('img/signatures/dest/', 'images', filename); // Adjust the directory as needed
  const filePath = path.join("img/signatures/", "dest", filename); // Adjust the directory as needed

  // Write the buffer to a file
  fs.writeFile(filePath, imageBuffer, (err) => {
    if (err) {
      console.error("Error saving image:", err);
    } else {
      console.log("Image saved successfully:", filePath);
    }
  });
  //
  doOcr(filePath, res);
});
// index
async function GetIndex() {
  //
  const data = await fs.readFileSync("index.html", "utf8");
  //const data = await fs.readFileSync("index.html");
  //
  return data;
}
//----------------------------------
// END POINTS
//----------------------------------
//http://localhost:3000/functionCall/?functionId=1
app.get("/functionCall/", (req, res) => {
  // Access query parameters using req.query
  let functionId = req.query.functionId || "Guest";
  let operation = "";
  //
  switch (functionId) {
    case "1":
      //
      operation = "Doing OCR!";
      //
      doOcr("img/signatures/dest/36ee4ca6dbb018e553ac64708d13a8b6");
      break;
  }
  //
  let msg = `functionId = ${functionId} : [${operation}]`;
  //
  res.send(msg);
});
//
(async () => {
  //
  const result = await GetIndex();
  //
  app.get("/Index", (req, res) => {
    res.send(result);
  });
  //
  console.log(result);
})();
//----------------------------------
// DRIVER CODE
//----------------------------------
//
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
