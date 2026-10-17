import Label from "../components/form/Label";
import Checkbox from "../components/form/input/Checkbox";
import Input from "../components/form/input/InputField";
import { EyeCloseIcon, EyeIcon } from "../icons";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import AuthLayout from "../layout/AuthPageLayout";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import user from "../services/auth";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const signupMutation = useMutation({
    mutationFn: (data: any) => user.signup(data),
    onSuccess: (response: any) => {
      toast.success(response.data?.message || "Sign up successful! Please log in.");
      navigate("/");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Sign up failed!";
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: any) => {
    // Exclude confirmPassword and the raw file input
    const { confirmPassword, profileImage: formProfileImage, ...signupData } = data;
    
    const payload = {
      ...signupData,
      profileImage: profileImage // this now contains the uploaded URL, or null
    };

    signupMutation.mutate(payload);
  };



  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await import("../services/http").then(m => m.default.post("/api/v1/upload/file", formData));
      const url = uploadRes.data?.response?.url;
      if (url) {
        setProfileImage(url);
        toast.success("Image uploaded successfully!");
      }
    } catch (error) {
      toast.error("Failed to upload profile image.");
    } finally {
      setIsUploading(false);
    }
  };

  const password = watch("password");

  return (
    <AuthLayout>
      <div className="no-scrollbar flex w-full flex-1 flex-col overflow-y-auto lg:w-1/2">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div>
            <div className="mb-5 sm:mb-8">
              <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
                Sign Up
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and password to sign up!
              </p>
            </div>
            <div>
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-5">
                  
                  {/* <!-- Profile Image Upload --> */}
                  <div className="flex flex-col items-center mb-2">
                    <div className="relative group">
                      <label 
                        htmlFor="profileImage" 
                        className="cursor-pointer flex items-center justify-center w-24 h-24 bg-gray-50 rounded-full border-2 border-dashed border-gray-300 hover:border-brand-500 overflow-hidden dark:bg-gray-800 dark:border-gray-700 dark:hover:border-brand-500 transition-all duration-300 shadow-sm group-hover:shadow-md"
                      >
                        {profileImage ? (
                          <>
                            <img src={profileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="bg-white p-2 rounded-full shadow-sm mb-1 dark:bg-gray-700 group-hover:scale-110 transition-transform">
                              <svg className="w-5 h-5 text-gray-500 dark:text-gray-300 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium group-hover:text-brand-500">Upload Photo</span>
                          </div>
                        )}
                      </label>
                      <input 
                        type="file" 
                        id="profileImage" 
                        accept="image/*" 
                        className="hidden" 
                        {...register("profileImage", {
                          onChange: (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              // Show temporary local preview while uploading
                              setProfileImage(URL.createObjectURL(file));
                              // Start real upload immediately
                              handleImageUpload(file);
                            }
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {/* <!-- First Name --> */}
                    <div className="sm:col-span-1">
                      <Label>
                        First Name<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter your first name"
                        error={!!errors.fname}
                        {...register("fname", { required: "First name is required" })}
                      />
                      {errors.fname && (
                        <p className="mt-1.5 text-xs text-error-500">
                          {errors.fname.message?.toString()}
                        </p>
                      )}
                    </div>
                    {/* <!-- Last Name --> */}
                    <div className="sm:col-span-1">
                      <Label>
                        Last Name<span className="text-error-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter your last name"
                        error={!!errors.lname}
                        {...register("lname", { required: "Last name is required" })}
                      />
                      {errors.lname && (
                        <p className="mt-1.5 text-xs text-error-500">
                          {errors.lname.message?.toString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* <!-- Email --> */}
                  <div>
                    <Label>
                      Email<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      error={!!errors.email}
                      {...register("email", { 
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address"
                        }
                      })}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {errors.email.message?.toString()}
                      </p>
                    )}
                  </div>
                  {/* <!-- Password --> */}
                  <div>
                    <Label>
                      Password<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Enter your password"
                        type={showPassword ? "text" : "password"}
                        error={!!errors.password}
                        {...register("password", { 
                          required: "Password is required",
                          minLength: {
                            value: 6,
                            message: "Password must be at least 6 characters"
                          }
                        })}
                      />
                      <span
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                        ) : (
                          <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                        )}
                      </span>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {errors.password.message?.toString()}
                      </p>
                    )}
                  </div>
                  {/* <!-- Confirm Password --> */}
                  <div>
                    <Label>
                      Confirm Password<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Confirm your password"
                        type={showConfirmPassword ? "text" : "password"}
                        error={!!errors.confirmPassword}
                        {...register("confirmPassword", { 
                          required: "Please confirm your password",
                          validate: (value) => 
                            value === password || "Passwords do not match"
                        })}
                      />
                      <span
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                        ) : (
                          <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                        )}
                      </span>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {errors.confirmPassword.message?.toString()}
                      </p>
                    )}
                  </div>
                  {/* <!-- Checkbox --> */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      className="h-5 w-5"
                      checked={isChecked}
                      onChange={setIsChecked}
                    />
                    <p className="inline-block font-normal text-gray-500 dark:text-gray-400">
                      By creating an account means you agree to the{" "}
                      <span className="text-gray-800 dark:text-white/90">
                        Terms and Conditions,
                      </span>{" "}
                      and our{" "}
                      <span className="text-gray-800 dark:text-white">
                        Privacy Policy
                      </span>
                    </p>
                  </div>
                  {/* <!-- Button --> */}
                  <div>
                    <button type="submit" disabled={signupMutation.isPending || isUploading} className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:opacity-70 disabled:cursor-not-allowed">
                      {signupMutation.isPending || isUploading ? "Signing up..." : "Sign Up"}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-5">
                <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
                  Already have an account?{" "}
                  <Link
                    to="/"
                    className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
