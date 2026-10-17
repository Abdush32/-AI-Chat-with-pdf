import { useState } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import http from "../../services/http";
import { toast } from "react-toastify";
import { EyeCloseIcon, EyeIcon } from "../../icons";

export default function UserPasswordCard() {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      };

      const res = await http.post("/api/v1/auth/update-password", payload);
      if (res.data?.success || res.status === 200) {
        toast.success("Password updated successfully");
        setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(res.data?.message || "Failed to update password");
      }
    } catch (error: any) {
      console.error("Error updating password", error);
      toast.error(error?.response?.data?.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 mt-6">
      <div className="flex flex-col gap-5 pb-6 mb-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Security
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Change your account password securely.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6">
          <div>
            <Label>Old Password</Label>
            <div className="relative">
              <Input 
                type={showOldPassword ? "text" : "password"} 
                name="oldPassword" 
                value={formData.oldPassword} 
                onChange={handleInputChange} 
                placeholder="Enter old password"
              />
              <span
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
              >
                {showOldPassword ? (
                  <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                )}
              </span>
            </div>
          </div>
          <div>
            <Label>New Password</Label>
            <div className="relative">
              <Input 
                type={showNewPassword ? "text" : "password"} 
                name="newPassword" 
                value={formData.newPassword} 
                onChange={handleInputChange} 
                placeholder="Enter new password"
              />
              <span
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
              >
                {showNewPassword ? (
                  <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                )}
              </span>
            </div>
          </div>
          <div>
            <Label>Confirm Password</Label>
            <div className="relative">
              <Input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword" 
                value={formData.confirmPassword} 
                onChange={handleInputChange} 
                placeholder="Confirm new password"
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
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button size="sm" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Change Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
