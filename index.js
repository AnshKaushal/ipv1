require("dotenv").config()
const express = require("express")
const multer = require("multer")
const mysql = require("mysql2")
const fs = require("fs")
const _ = require('lodash')
const imgbbUploader = require("imgbb-uploader");
const bodyParser = require("body-parser");
const path = require('path')

const app = express()
const port = 3000 // Change the port number if needed

// Set up the view engine
app.set("view engine", "ejs")
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(__dirname + "/images"));
app.use(express.urlencoded({ extended: true }))
app.use(bodyParser.urlencoded({ extended: false }));

// Set up multer for file upload
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const connection = mysql.createConnection(process.env.DATABASE_URL)

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database: " + err.stack)
    return
  }
  console.log("Connected to PlanetScale!")
})

// Loading Json Files
const photosJson = fs.readFileSync(__dirname + "/data/photos.json", "utf-8")
const photos = {}
JSON.parse(photosJson).photos.forEach((photo) => {
  photos[photo.id] = photo.src
})

const imagesJson = fs.readFileSync(__dirname + "/data/images.json", "utf-8")
const images = {}
JSON.parse(imagesJson).images.forEach((image) => {
  images[image.id] = image.src
})

const postData = require(__dirname + "/data/data.json"); //data.json
const posts = postData.posts; //posts

// All the routes
app.post("/submit", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).send("No file uploaded.");
      return;
    }

    const name = req.body.name;
    const image = req.file.buffer;

    const response = await imgbbUploader({
      apiKey: "cac657f9d11feca4d9d26fab6d265ca7",
      base64string: image.toString("base64"),
      name: req.file.originalname,
    });

    const imageUrl = response.url;

    const query = "INSERT INTO photos (name, image) VALUES (?, ?)";
    connection.query(query, [name, imageUrl], (error, results) => {
      if (error) {
        console.error("Error inserting photo into the database: " + error);
        res.sendStatus(500);
      } else {
        res.redirect("/images");
      }
    });
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/images", (req, res) => {
  const query = "SELECT * FROM photos"
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Error retrieving photos from the database: " + error)
      res.sendStatus(500)
    } else {
      res.render("photos", { photos: results, active: 'photos' })
    }
  })
})

app.get("/contact", function (req, res) {
    res.render("contact", { active: "contact" });
  });
  

app.get("/submit", function (req, res) {
    res.render("submit", { active: "submit", error: null });
  });


app.get("/", function (req, res) {
  res.render("index", { active: "index", images: images })
})

app.get("/about", function (req, res) {
  res.render("about", { active: "about" })
})

app.get("/portfolio", function (req, res) {
  res.render("portfolio", { active: "portfolio", photos: photos })
})
app.get("/posts", function (req, res) {
  res.render("posts", { active: "posts", posts: posts })
})

app.get("/posts/:postName", (req, res) => {
  const requestedTitle = _.lowerCase(req.params.postName)

  posts.forEach(function (post) {
    const storedTitle = _.lowerCase(post.title)

    if (storedTitle === requestedTitle) {
      res.render("blog-post", {
        id: post.id,
        title: post.title,
        content: post.content,
        image: post.image,
        description: post.description,
        active: "Post",
      })
    }
  })
})

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
