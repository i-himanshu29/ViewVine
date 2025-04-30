import multer from "multer"

const storage = multer.diskStorage({ // use diskStorage
    destination: function (req, file, cb) {
      cb(null, './public/temp') // this is the path of image where it is stored
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    //   cb(null, file.fieldname + '-' + uniqueSuffix)
    cb(null,file.originalname)
    }
  })
  
export const upload = multer({
    storage, 
})