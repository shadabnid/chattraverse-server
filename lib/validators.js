import { body, check, param, validationResult } from "express-validator";
import { ErrorHandler } from "../utils/utility.js";

const validateHandler = (req, res, next) => {
    const errors = validationResult(req);

    const errorMessages = errors
        .array()
        .map((error) => error.msg)
        .join(",");
    if (errors.isEmpty()) return next();
    else
        return next(new ErrorHandler(errorMessages, 400));
}

const registerValidator = () => [
    body("name", "Please Enter your name").notEmpty(),
    body("username", "Please Enter your username").notEmpty(),
    body("password", "Please Enter your password").notEmpty(),
    body("bio", "Please Enter your bio").notEmpty(),
];

const loginValidator = () => [
    body("username", "Please Enter your username").notEmpty(),
    body("password", "Please Enter your password").notEmpty(),
];

const newGroupChatValidator = () => [
    body("name", "please Provide name").notEmpty(),
    body("members")
        .notEmpty()
        .withMessage("Please Provide members")
        .isArray({ min: 2, max: 100 })
        .withMessage("members array between 3 to 100"),
];

const addMemberValidator = () => [
    body("chatId", "please Provide chatId").notEmpty(),
    body("members")
        .notEmpty()
        .withMessage("Please Provide members")
        .isArray({ min: 1, max: 97 })
        .withMessage("members array between 1-97"),

];

const removeMemberValidator = () => [
    body("chatId", "please Provide chatId").notEmpty(),
    body("userID", "Please provide userId").notEmpty()
];

const chatIdValidator = () => [
    param("id", "please Provide chatId").notEmpty(),
];

const sendAttachmentValidator = () => [
    body("chatId", "please Provide chatId").notEmpty(),
];

const renameGroupValidator = ()=>[
    param("id", "please Provide chatId").notEmpty(),
    body("name","please Provide Group Name").notEmpty(),
]

const requestValidator = ()=>[
    body("userId", "please Provide user Id").notEmpty(),
    
]

const acceptRequestValidator =()=> [
    
        body("requestId", "Please Enter Request Id").notEmpty(),
        body("accept")
            .notEmpty().withMessage("Please add Accept")
            .isBoolean().withMessage("Provide Boolean value")
]

const adminValidator = ()=>[
    body("secretKey", "please Provide secret key").notEmpty(),
    
]


export {
    addMemberValidator,
    chatIdValidator,
    loginValidator,
    newGroupChatValidator,
    registerValidator,
    removeMemberValidator,
    sendAttachmentValidator,
    validateHandler,
    renameGroupValidator,
    requestValidator,
    acceptRequestValidator,
    adminValidator
};

