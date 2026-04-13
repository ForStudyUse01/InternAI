import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    companyName: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["intern", "company"], required: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ mobileNumber: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };
export const UserModel = model("User", userSchema);
