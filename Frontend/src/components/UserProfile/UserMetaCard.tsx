import { useEffect, useState } from "react";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import http from "../../services/http";
import { toast } from "react-toastify";
import ProfileSkeleton from "../ui/skeleton/ProfileSkeleton";

export default function UserMetaCard() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    profileImage: null as string | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await http.get("/api/v1/auth/profile");
      if (res.data?.data) {
        setProfile(res.data.data);
        setFormData({
          fname: res.data.data.fname || "",
          lname: res.data.data.lname || "",
          email: res.data.data.email || "",
          profileImage: null,
        });
      }
    } catch (error) {
      console.error("Error fetching profile", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await http.post("/api/v1/upload/file", uploadData);
      const url = res.data?.response?.url;
      if (url) {
        setFormData((prev) => ({ ...prev, profileImage: url }));
        toast.success("Image uploaded successfully!");
      }
    } catch (error) {
      console.error("Error uploading profile image", error);
      toast.error("Failed to upload profile image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleImageUpload(file);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        fname: formData.fname,
        lname: formData.lname,
        profileImage: formData.profileImage
      };

      const res = await http.patch("/api/v1/auth/profile", payload);
      if (res.data?.success) {
        toast.success("Profile updated successfully");
        fetchProfile();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between pb-6 mb-6">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 relative">
            <img src={formData.profileImage || profile?.profileImage || "/images/user/owner.jpg"} alt="user" className="object-cover w-full h-full" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs">Uploading...</span>
              </div>
            )}
          </div>
          <div className="order-3 xl:order-2">
            <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              {profile?.fname} {profile?.lname}
            </h4>
          </div>
        </div>

        <div className="flex gap-3">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => {
                setIsEditing(false);
                setFormData({
                  fname: profile?.fname || "",
                  lname: profile?.lname || "",
                  email: profile?.email || "",
                  profileImage: null,
                });
              }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUploading}>
                Save
              </Button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 xl:w-auto"
            >
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                  fill=""
                />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-2 lg:gap-x-6">
        <div>
          <Label>First Name</Label>
          {isEditing ? (
            <Input type="text" name="fname" value={formData.fname} onChange={handleInputChange} />
          ) : (
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile?.fname || "-"}</p>
          )}
        </div>
        <div>
          <Label>Last Name</Label>
          {isEditing ? (
            <Input type="text" name="lname" value={formData.lname} onChange={handleInputChange} />
          ) : (
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile?.lname || "-"}</p>
          )}
        </div>
        <div>
          <Label>Email address</Label>
          {isEditing ? (
            <Input type="text" name="email" value={formData.email} disabled />
          ) : (
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile?.email || "-"}</p>
          )}
        </div>
        {isEditing && (
          <div>
            <Label>Profile Image</Label>
            <Input type="file" name="profileImage" onChange={handleFileChange} disabled={isUploading} />
          </div>
        )}
      </div>
    </div>
  );
}
